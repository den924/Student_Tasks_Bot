const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const GroupRequest = sequelize.define(
    "GroupRequest",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        groupName: {
            type: DataTypes.STRING,
            allowNull: false
        },

        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        status: {
            type: DataTypes.ENUM(
                "PENDING",
                "APPROVED",
                "REJECTED"
            ),
            allowNull: false,
            defaultValue: "PENDING"
        }
    },
    {
        tableName: "group_requests",
        timestamps: true
    }
);

module.exports = GroupRequest;