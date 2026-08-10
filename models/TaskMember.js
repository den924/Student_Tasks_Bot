const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const TaskMember = sequelize.define(
    "TaskMember",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        taskId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        completed: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        completedAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        tableName: "task_members",
        timestamps: true
    }
);

module.exports = TaskMember;