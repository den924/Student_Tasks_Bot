const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const TaskRequest = sequelize.define(
    "TaskRequest",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        title: {
            type: DataTypes.STRING,
            allowNull: false
        },

        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        deadline: {
            type: DataTypes.DATE,
            allowNull: false
        },

        groupId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        subjectId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        creatorId: {
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
        tableName: "task_requests",
        timestamps: true
    }
);

module.exports = TaskRequest;