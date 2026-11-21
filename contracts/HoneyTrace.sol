
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract HoneyTrace is AccessControl {

    // ==========================================
    // 1. STAKEHOLDER ROLES
    // ==========================================

    bytes32 public constant BEEKEEPER_ROLE =
        keccak256("BEEKEEPER_ROLE");

    bytes32 public constant PROCESSOR_ROLE =
        keccak256("PROCESSOR_ROLE");

    bytes32 public constant DISTRIBUTOR_ROLE =
        keccak256("DISTRIBUTOR_ROLE");

    bytes32 public constant RETAILER_ROLE =
        keccak256("RETAILER_ROLE");


    // ==========================================
    // 2. BATCH LIFECYCLE
    // ==========================================

    enum BatchStatus {
        HARVESTED,
        PROCESSED,
        SHIPPED,
        RECEIVED
    }


    // ==========================================
    // 3. DATA STRUCTURES
    // ==========================================

    struct HoneyBatch {
        uint256 id;
        address beekeeper;
        string honeyType;
        string hiveId;
        uint256 harvestDate;
        uint256 quantityGrams;
        string originRegion;
        BatchStatus status;
        bool exists;
    }

    struct TraceabilityEvent {
        BatchStatus stage;
        address actor;
        uint256 timestamp;
        string location;
        string notes;
    }


    // ==========================================
    // 4. STORAGE
    // ==========================================

    uint256 public batchCount;

    mapping(uint256 => HoneyBatch) private batches;

    mapping(uint256 => TraceabilityEvent[]) private batchHistory;


    // ==========================================
    // 5. EVENTS
    // ==========================================

    event StakeholderRegistered(
        address indexed account,
        bytes32 indexed role,
        address indexed registeredBy
    );

    event StakeholderRevoked(
        address indexed account,
        bytes32 indexed role,
        address indexed revokedBy
    );

    event BatchCreated(
        uint256 indexed batchId,
        address indexed beekeeper,
        string honeyType,
        uint256 quantityGrams
    );

    event TraceabilityEventRecorded(
        uint256 indexed batchId,
        BatchStatus indexed stage,
        address indexed actor,
        uint256 timestamp,
        string location,
        string notes
    );


    // ==========================================
    // 6. CONSTRUCTOR
    // ==========================================

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    // ==========================================
    // 7. STAKEHOLDER MANAGEMENT
    // ==========================================

    function isStakeholderRole(
        bytes32 role
    ) public pure returns (bool) {

        return (
            role == BEEKEEPER_ROLE ||
            role == PROCESSOR_ROLE ||
            role == DISTRIBUTOR_ROLE ||
            role == RETAILER_ROLE
        );
    }

    function registerStakeholder(
        address account,
        bytes32 role
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {

        require(
            account != address(0),
            "HoneyTrace: invalid address"
        );

        require(
            isStakeholderRole(role),
            "HoneyTrace: invalid role"
        );

        require(
            !hasRole(role, account),
            "HoneyTrace: role already assigned"
        );

        _grantRole(role, account);

        emit StakeholderRegistered(
            account,
            role,
            msg.sender
        );
    }

    function revokeStakeholder(
        address account,
        bytes32 role
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {

        require(
            account != address(0),
            "HoneyTrace: invalid address"
        );

        require(
            isStakeholderRole(role),
            "HoneyTrace: invalid role"
        );

        require(
            hasRole(role, account),
            "HoneyTrace: role not assigned"
        );

        _revokeRole(role, account);

        emit StakeholderRevoked(
            account,
            role,
            msg.sender
        );
    }


    // ==========================================
    // 8. HONEY BATCH CREATION
    // ==========================================

    function createBatch(
        string calldata honeyType,
        string calldata hiveId,
        uint256 harvestDate,
        uint256 quantityGrams,
        string calldata originRegion
    )
        external
        onlyRole(BEEKEEPER_ROLE)
        returns (uint256)
    {

        // Validate batch information

        require(
            bytes(honeyType).length > 0,
            "HoneyTrace: empty honey type"
        );

        require(
            bytes(hiveId).length > 0,
            "HoneyTrace: empty hive ID"
        );

        require(
            bytes(originRegion).length > 0,
            "HoneyTrace: empty origin region"
        );

        require(
            harvestDate > 0,
            "HoneyTrace: invalid harvest date"
        );

        require(
            harvestDate <= block.timestamp,
            "HoneyTrace: harvest date is in the future"
        );

        require(
            quantityGrams > 0,
            "HoneyTrace: quantity must be positive"
        );


        // Generate a unique batch ID

        batchCount++;

        uint256 batchId = batchCount;


        // Store the batch

        batches[batchId] = HoneyBatch({

            id: batchId,

            beekeeper: msg.sender,

            honeyType: honeyType,

            hiveId: hiveId,

            harvestDate: harvestDate,

            quantityGrams: quantityGrams,

            originRegion: originRegion,

            status: BatchStatus.HARVESTED,

            exists: true

        });


        // Automatically create the first history event

        string memory notes = "Honey batch harvested and registered";

        batchHistory[batchId].push(
            TraceabilityEvent({

                stage: BatchStatus.HARVESTED,

                actor: msg.sender,

                timestamp: block.timestamp,

                location: originRegion,

                notes: notes

            })
        );


        // Emit blockchain events

        emit BatchCreated(
            batchId,
            msg.sender,
            honeyType,
            quantityGrams
        );

        emit TraceabilityEventRecorded(
            batchId,
            BatchStatus.HARVESTED,
            msg.sender,
            block.timestamp,
            originRegion,
            notes
        );

        return batchId;
    }


    // ==========================================
    // 9. READ BATCH INFORMATION
    // ==========================================

    function getBatch(
        uint256 batchId
    )
        external
        view
        returns (HoneyBatch memory)
    {

        require(
            batches[batchId].exists,
            "HoneyTrace: batch does not exist"
        );

        return batches[batchId];
    }


    // ==========================================
    // 10. READ BATCH HISTORY
    // ==========================================

    function getBatchHistory(
        uint256 batchId
    )
        external
        view
        returns (TraceabilityEvent[] memory)
    {

        require(
            batches[batchId].exists,
            "HoneyTrace: batch does not exist"
        );

        return batchHistory[batchId];
    }

}
