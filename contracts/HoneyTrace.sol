
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin role-based access control
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract HoneyTrace is AccessControl {

    // ==============================
    // 1. STAKEHOLDER ROLES
    // ==============================

    bytes32 public constant BEEKEEPER_ROLE =
        keccak256("BEEKEEPER_ROLE");

    bytes32 public constant PROCESSOR_ROLE =
        keccak256("PROCESSOR_ROLE");

    bytes32 public constant DISTRIBUTOR_ROLE =
        keccak256("DISTRIBUTOR_ROLE");

    bytes32 public constant RETAILER_ROLE =
        keccak256("RETAILER_ROLE");


    // ==============================
    // 2. EVENTS
    // ==============================

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


    // ==============================
    // 3. CONSTRUCTOR
    // ==============================

    constructor() {
        // The wallet deploying the contract becomes its administrator.
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    // ==============================
    // 4. ROLE VALIDATION
    // ==============================

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


    // ==============================
    // 5. REGISTER STAKEHOLDER
    // ==============================

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


    // ==============================
    // 6. REVOKE STAKEHOLDER
    // ==============================

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
}
