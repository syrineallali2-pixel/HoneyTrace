
import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("HoneyTrace - Supply Chain Operations", function () {

    // ==========================================
    // HELPER: CREATE A COMPLETE TEST SCENARIO
    // ==========================================

    async function deployScenario() {

        const [
            admin,
            beekeeper,
            processor,
            distributor,
            retailer,
            outsider
        ] = await ethers.getSigners();

        const honeyTrace = await ethers.deployContract("HoneyTrace");

        // Register all stakeholders

        await honeyTrace.registerStakeholder(
            beekeeper.address,
            await honeyTrace.BEEKEEPER_ROLE()
        );

        await honeyTrace.registerStakeholder(
            processor.address,
            await honeyTrace.PROCESSOR_ROLE()
        );

        await honeyTrace.registerStakeholder(
            distributor.address,
            await honeyTrace.DISTRIBUTOR_ROLE()
        );

        await honeyTrace.registerStakeholder(
            retailer.address,
            await honeyTrace.RETAILER_ROLE()
        );

        // Create an initial honey batch

        const block = await ethers.provider.getBlock("latest");

        if (block === null) {
            throw new Error("Latest block not found");
        }

        await honeyTrace.connect(beekeeper).createBatch(
            "Orange Blossom",
            "HIVE-012",
            BigInt(block.timestamp),
            50000n,
            "Saida, Algeria"
        );

        return {
            honeyTrace,
            admin,
            beekeeper,
            processor,
            distributor,
            retailer,
            outsider
        };
    }


    // ==========================================
    // TEST 1: PROCESSING SUCCESS
    // ==========================================

    it("Should allow processor to record processing", async function () {

        const { honeyTrace, processor } = await deployScenario();

        await expect(
            honeyTrace.connect(processor).recordProcessing(
                1n,
                "Processing Facility, Saida",
                "Filtered honey; moisture: 17.5%"
            )
        ).to.emit(
            honeyTrace,
            "TraceabilityEventRecorded"
        );

        const batch = await honeyTrace.getBatch(1n);

        expect(batch.status).to.equal(1n);
    });


    // ==========================================
    // TEST 2: PROCESSING AUTHORIZATION
    // ==========================================

    it("Should reject processing by an unauthorized wallet", async function () {

        const { honeyTrace, outsider } = await deployScenario();

        await expect(
            honeyTrace.connect(outsider).recordProcessing(
                1n,
                "Saida",
                "Processing information"
            )
        ).to.be.revertedWithCustomError(
            honeyTrace,
            "AccessControlUnauthorizedAccount"
        );
    });


    // ==========================================
    // TEST 3: NONEXISTENT BATCH
    // ==========================================

    it("Should reject processing of a nonexistent batch", async function () {

        const { honeyTrace, processor } = await deployScenario();

        await expect(
            honeyTrace.connect(processor).recordProcessing(
                999n,
                "Saida",
                "Processing information"
            )
        ).to.be.revertedWith(
            "HoneyTrace: batch does not exist"
        );
    });


    // ==========================================
    // TEST 4: INVALID PROCESSING TRANSITION
    // ==========================================

    it("Should reject processing a batch more than once", async function () {

        const { honeyTrace, processor } = await deployScenario();

        await honeyTrace.connect(processor).recordProcessing(
            1n,
            "Saida",
            "First processing"
        );

        await expect(
            honeyTrace.connect(processor).recordProcessing(
                1n,
                "Saida",
                "Second processing"
            )
        ).to.be.revertedWith(
            "HoneyTrace: batch must be harvested"
        );
    });


    // ==========================================
    // TEST 5: LOCATION AND NOTES VALIDATION
    // ==========================================

    it("Should reject empty location or notes", async function () {

        const { honeyTrace, processor } = await deployScenario();

        await expect(
            honeyTrace.connect(processor).recordProcessing(
                1n,
                "",
                "Processing details"
            )
        ).to.be.revertedWith(
            "HoneyTrace: empty location"
        );

        await expect(
            honeyTrace.connect(processor).recordProcessing(
                1n,
                "Saida",
                ""
            )
        ).to.be.revertedWith(
            "HoneyTrace: empty notes"
        );
    });


    // ==========================================
    // TEST 6: SHIPMENT SUCCESS
    // ==========================================

    it("Should allow distributor to ship a processed batch", async function () {

        const { honeyTrace, processor, distributor } =
            await deployScenario();

        await honeyTrace.connect(processor).recordProcessing(
            1n,
            "Processing Facility, Saida",
            "Filtering completed"
        );

        await expect(
            honeyTrace.connect(distributor).recordShipment(
                1n,
                "Distribution Center, Oran",
                "Transported in sealed containers"
            )
        ).to.emit(
            honeyTrace,
            "TraceabilityEventRecorded"
        );

        const batch = await honeyTrace.getBatch(1n);

        expect(batch.status).to.equal(2n);
    });


    // ==========================================
    // TEST 7: SHIPMENT BEFORE PROCESSING
    // ==========================================

    it("Should reject shipment before processing", async function () {

        const { honeyTrace, distributor } =
            await deployScenario();

        await expect(
            honeyTrace.connect(distributor).recordShipment(
                1n,
                "Oran",
                "Shipment information"
            )
        ).to.be.revertedWith(
            "HoneyTrace: batch must be processed"
        );
    });


    // ==========================================
    // TEST 8: RECEPTION SUCCESS
    // ==========================================

    it("Should allow retailer to receive a shipped batch", async function () {

        const { honeyTrace, processor, distributor, retailer } =
            await deployScenario();

        // Processing

        await honeyTrace.connect(processor).recordProcessing(
            1n,
            "Saida",
            "Processing completed"
        );

        // Shipment

        await honeyTrace.connect(distributor).recordShipment(
            1n,
            "Oran",
            "Shipment completed"
        );

        // Reception

        await expect(
            honeyTrace.connect(retailer).recordReception(
                1n,
                "Retail Store, Oran",
                "Batch received and inspected"
            )
        ).to.emit(
            honeyTrace,
            "TraceabilityEventRecorded"
        );

        const batch = await honeyTrace.getBatch(1n);

        expect(batch.status).to.equal(3n);
    });


    // ==========================================
    // TEST 9: RECEPTION BEFORE SHIPMENT
    // ==========================================

    it("Should reject reception before shipment", async function () {

        const { honeyTrace, retailer } = await deployScenario();

        await expect(
            honeyTrace.connect(retailer).recordReception(
                1n,
                "Oran",
                "Received"
            )
        ).to.be.revertedWith(
            "HoneyTrace: batch must be shipped"
        );
    });


    // ==========================================
    // TEST 10: REVOKED PROCESSOR
    // ==========================================

    it("Should prevent a revoked processor from processing batches", async function () {

        const { honeyTrace, admin, processor } = await deployScenario();

        const processorRole = await honeyTrace.PROCESSOR_ROLE();

        await honeyTrace.connect(admin).revokeStakeholder(
            processor.address,
            processorRole
        );

        await expect(
            honeyTrace.connect(processor).recordProcessing(
                1n,
                "Saida",
                "Processing information"
            )
        ).to.be.revertedWithCustomError(
            honeyTrace,
            "AccessControlUnauthorizedAccount"
        );
    });


    // ==========================================
    // TEST 11: COMPLETE TRACEABILITY HISTORY
    // ==========================================

    it("Should preserve the complete chronological supply-chain history", async function () {

        const {
            honeyTrace,
            beekeeper,
            processor,
            distributor,
            retailer
        } = await deployScenario();

        // Processing

        await honeyTrace.connect(processor).recordProcessing(
            1n,
            "Processing Facility, Saida",
            "Filtered and quality checked"
        );

        // Shipment

        await honeyTrace.connect(distributor).recordShipment(
            1n,
            "Distribution Center, Oran",
            "Transported in sealed containers"
        );

        // Reception

        await honeyTrace.connect(retailer).recordReception(
            1n,
            "Retail Store, Oran",
            "Batch received"
        );

        const history = await honeyTrace.getBatchHistory(1n);

        expect(history.length).to.equal(4);

        // Check lifecycle sequence

        expect(
            history.map(event => event.stage)
        ).to.deep.equal([0n, 1n, 2n, 3n]);

        // Check actors

        expect(history[0].actor).to.equal(beekeeper.address);
        expect(history[1].actor).to.equal(processor.address);
        expect(history[2].actor).to.equal(distributor.address);
        expect(history[3].actor).to.equal(retailer.address);

        // Check final status

        const batch = await honeyTrace.getBatch(1n);

        expect(batch.status).to.equal(3n);
    });

});
