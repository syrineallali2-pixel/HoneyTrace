
import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("HoneyTrace - Stakeholder Management", function () {

    async function deployHoneyTrace() {
        const [admin, beekeeper, processor, outsider] =
            await ethers.getSigners();

        const honeyTrace = await ethers.deployContract("HoneyTrace");

        return {
            honeyTrace,
            admin,
            beekeeper,
            processor,
            outsider
        };
    }

    // TEST 1: Contract administrator
    it("Should assign DEFAULT_ADMIN_ROLE to the deployer", async function () {
        const { honeyTrace, admin } = await deployHoneyTrace();

        const adminRole = await honeyTrace.DEFAULT_ADMIN_ROLE();

        expect(
            await honeyTrace.hasRole(adminRole, admin.address)
        ).to.equal(true);
    });

    // TEST 2: Register a beekeeper
    it("Should allow admin to register a beekeeper", async function () {
        const { honeyTrace, admin, beekeeper } =
            await deployHoneyTrace();

        const role = await honeyTrace.BEEKEEPER_ROLE();

        await expect(
            honeyTrace.registerStakeholder(beekeeper.address, role)
        )
            .to.emit(honeyTrace, "StakeholderRegistered")
            .withArgs(beekeeper.address, role, admin.address);

        expect(
            await honeyTrace.hasRole(role, beekeeper.address)
        ).to.equal(true);
    });

    // TEST 3: Unauthorized registration
    it("Should reject registration by a non-admin", async function () {
        const { honeyTrace, beekeeper, processor } =
            await deployHoneyTrace();

        const role = await honeyTrace.PROCESSOR_ROLE();

        await expect(
            honeyTrace.connect(beekeeper)
                .registerStakeholder(processor.address, role)
        ).to.be.revertedWithCustomError(
            honeyTrace,
            "AccessControlUnauthorizedAccount"
        );
    });

    // TEST 4: Invalid role
    it("Should reject an invalid stakeholder role", async function () {
        const { honeyTrace, beekeeper } = await deployHoneyTrace();

        const invalidRole = ethers.id("UNKNOWN_ROLE");

        await expect(
            honeyTrace.registerStakeholder(beekeeper.address, invalidRole)
        ).to.be.revertedWith("HoneyTrace: invalid role");
    });

    // TEST 5: Zero address
    it("Should reject the zero address", async function () {
        const { honeyTrace } = await deployHoneyTrace();

        const role = await honeyTrace.BEEKEEPER_ROLE();

        await expect(
            honeyTrace.registerStakeholder(ethers.ZeroAddress, role)
        ).to.be.revertedWith("HoneyTrace: invalid address");
    });

    // TEST 6: Duplicate registration
    it("Should reject duplicate role assignment", async function () {
        const { honeyTrace, beekeeper } = await deployHoneyTrace();

        const role = await honeyTrace.BEEKEEPER_ROLE();

        await honeyTrace.registerStakeholder(beekeeper.address, role);

        await expect(
            honeyTrace.registerStakeholder(beekeeper.address, role)
        ).to.be.revertedWith("HoneyTrace: role already assigned");
    });

    // TEST 7: Revoke stakeholder
    it("Should allow admin to revoke a stakeholder role", async function () {
        const { honeyTrace, admin, beekeeper } =
            await deployHoneyTrace();

        const role = await honeyTrace.BEEKEEPER_ROLE();

        await honeyTrace.registerStakeholder(beekeeper.address, role);

        await expect(
            honeyTrace.revokeStakeholder(beekeeper.address, role)
        )
            .to.emit(honeyTrace, "StakeholderRevoked")
            .withArgs(beekeeper.address, role, admin.address);

        expect(
            await honeyTrace.hasRole(role, beekeeper.address)
        ).to.equal(false);
    });

});
