
import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("HoneyTrace - Honey Batch Management", function () {

    // ------------------------------------------
    // Helper: obtain latest blockchain timestamp
    // ------------------------------------------

    async function latestTimestamp(): Promise<bigint> {
        const block = await ethers.provider.getBlock("latest");

        if (block === null) {
            throw new Error("Latest block not found");
        }

        return BigInt(block.timestamp);
    }


    // ------------------------------------------
    // Helper: deploy and register a beekeeper
    // ------------------------------------------

    async function deployWithBeekeeper() {

        const [admin, beekeeper, outsider] =
            await ethers.getSigners();

        const honeyTrace = await ethers.deployContract("HoneyTrace");

        const beekeeperRole = await honeyTrace.BEEKEEPER_ROLE();

        await honeyTrace.registerStakeholder(
            beekeeper.address,
            beekeeperRole
        );

        return {
            honeyTrace,
            admin,
            beekeeper,
            outsider
        };
    }


    // ------------------------------------------
    // Helper: sample batch information
    // ------------------------------------------

    async function validBatchInput() {
        return {
            honeyType: "Orange Blossom",
            hiveId: "HIVE-012",
            harvestDate: await latestTimestamp(),
            quantityGrams: 50000n,
            originRegion: "Saida, Algeria"
        };
    }


    // ==========================================
    // TEST 1: Authorization
    // ==========================================

    it("Should reject batch creation by a non-beekeeper", async function () {

        const { honeyTrace, outsider } =
            await deployWithBeekeeper();

        const batch = await validBatchInput();

        await expect(
            honeyTrace.connect(outsider).createBatch(
                batch.honeyType,
                batch.hiveId,
                batch.harvestDate,
                batch.quantityGrams,
                batch.originRegion
            )
        ).to.be.revertedWithCustomError(
            honeyTrace,
            "AccessControlUnauthorizedAccount"
        );
    });


    // ==========================================
    // TEST 2: Successful creation
    // ==========================================

    it("Should allow an authorized beekeeper to create a batch", async function () {

        const { honeyTrace, beekeeper } =
            await deployWithBeekeeper();

        const batch = await validBatchInput();

        await expect(
            honeyTrace.connect(beekeeper).createBatch(
                batch.honeyType,
                batch.hiveId,
                batch.harvestDate,
                batch.quantityGrams,
                batch.originRegion
            )
        )
            .to.emit(honeyTrace, "BatchCreated")
            .withArgs(
                1n,
                beekeeper.address,
                batch.honeyType,
                batch.quantityGrams
            );

        expect(await honeyTrace.batchCount()).to.equal(1n);
    });


    // ==========================================
    // TEST 3: Unique IDs
    // ==========================================

    it("Should generate unique IDs for different batches", async function () {

        const { honeyTrace, beekeeper } =
            await deployWithBeekeeper();

        const batch = await validBatchInput();

        await honeyTrace.connect(beekeeper).createBatch(
            batch.honeyType,
            batch.hiveId,
            batch.harvestDate,
            batch.quantityGrams,
            batch.originRegion
        );

        await honeyTrace.connect(beekeeper).createBatch(
            "Forest Honey",
            "HIVE-020",
            batch.harvestDate,
            30000n,
            "Tlemcen, Algeria"
        );

        expect(await honeyTrace.batchCount()).to.equal(2n);

        expect(
            (await honeyTrace.getBatch(1n)).id
        ).to.equal(1n);

        expect(
            (await honeyTrace.getBatch(2n)).id
        ).to.equal(2n);
    });


    // ==========================================
    // TEST 4: Store batch information
    // ==========================================

    it("Should correctly store all batch information", async function () {

        const { honeyTrace, beekeeper } =
            await deployWithBeekeeper();

        const batch = await validBatchInput();

        await honeyTrace.connect(beekeeper).createBatch(
            batch.honeyType,
            batch.hiveId,
            batch.harvestDate,
            batch.quantityGrams,
            batch.originRegion
        );

        const storedBatch = await honeyTrace.getBatch(1n);

        expect(storedBatch.id).to.equal(1n);
        expect(storedBatch.beekeeper).to.equal(beekeeper.address);
        expect(storedBatch.honeyType).to.equal(batch.honeyType);
        expect(storedBatch.hiveId).to.equal(batch.hiveId);
        expect(storedBatch.harvestDate).to.equal(batch.harvestDate);
        expect(storedBatch.quantityGrams).to.equal(batch.quantityGrams);
        expect(storedBatch.originRegion).to.equal(batch.originRegion);

        expect(storedBatch.status).to.equal(0n);
        expect(storedBatch.exists).to.equal(true);
    });


    // ==========================================
    // TEST 5: Initial history event
    // ==========================================

    it("Should automatically record the harvesting event", async function () {

        const { honeyTrace, beekeeper } =
            await deployWithBeekeeper();

        const batch = await validBatchInput();

        await honeyTrace.connect(beekeeper).createBatch(
            batch.honeyType,
            batch.hiveId,
            batch.harvestDate,
            batch.quantityGrams,
            batch.originRegion
        );

        const history = await honeyTrace.getBatchHistory(1n);

        expect(history.length).to.equal(1);

        expect(history[0].stage).to.equal(0n);
        expect(history[0].actor).to.equal(beekeeper.address);
        expect(history[0].location).to.equal(batch.originRegion);

        expect(history[0].timestamp).to.be.greaterThan(0n);

        expect(history[0].notes).to.equal(
            "Honey batch harvested and registered"
        );
    });


    // ==========================================
    // TEST 6: Input validation
    // ==========================================

    it("Should reject empty batch information", async function () {

        const { honeyTrace, beekeeper } =
            await deployWithBeekeeper();

        const batch = await validBatchInput();

        await expect(
            honeyTrace.connect(beekeeper).createBatch(
                "",
                batch.hiveId,
                batch.harvestDate,
                batch.quantityGrams,
                batch.originRegion
            )
        ).to.be.revertedWith("HoneyTrace: empty honey type");

        await expect(
            honeyTrace.connect(beekeeper).createBatch(
                batch.honeyType,
                "",
                batch.harvestDate,
                batch.quantityGrams,
                batch.originRegion
            )
        ).to.be.revertedWith("HoneyTrace: empty hive ID");

        await expect(
            honeyTrace.connect(beekeeper).createBatch(
                batch.honeyType,
                batch.hiveId,
                batch.harvestDate,
                batch.quantityGrams,
                ""
            )
        ).to.be.revertedWith("HoneyTrace: empty origin region");
    });


    // ==========================================
    // TEST 7: Quantity validation
    // ==========================================

    it("Should reject zero quantity", async function () {

        const { honeyTrace, beekeeper } =
            await deployWithBeekeeper();

        const batch = await validBatchInput();

        await expect(
            honeyTrace.connect(beekeeper).createBatch(
                batch.honeyType,
                batch.hiveId,
                batch.harvestDate,
                0n,
                batch.originRegion
            )
        ).to.be.revertedWith(
            "HoneyTrace: quantity must be positive"
        );
    });


    // ==========================================
    // TEST 8: Harvest date validation
    // ==========================================

    it("Should reject invalid or future harvest dates", async function () {

        const { honeyTrace, beekeeper } =
            await deployWithBeekeeper();

        const batch = await validBatchInput();

        await expect(
            honeyTrace.connect(beekeeper).createBatch(
                batch.honeyType,
                batch.hiveId,
                0n,
                batch.quantityGrams,
                batch.originRegion
            )
        ).to.be.revertedWith(
            "HoneyTrace: invalid harvest date"
        );

        const futureDate = (await latestTimestamp()) + 86400n;

        await expect(
            honeyTrace.connect(beekeeper).createBatch(
                batch.honeyType,
                batch.hiveId,
                futureDate,
                batch.quantityGrams,
                batch.originRegion
            )
        ).to.be.revertedWith(
            "HoneyTrace: harvest date is in the future"
        );
    });


    // ==========================================
    // TEST 9: Nonexistent batches
    // ==========================================

    it("Should reject attempts to retrieve nonexistent batches", async function () {

        const { honeyTrace } = await deployWithBeekeeper();

        await expect(
            honeyTrace.getBatch(999n)
        ).to.be.revertedWith(
            "HoneyTrace: batch does not exist"
        );

        await expect(
            honeyTrace.getBatchHistory(999n)
        ).to.be.revertedWith(
            "HoneyTrace: batch does not exist"
        );
    });

});
