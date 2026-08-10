const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const TaskNotification = sequelize.define(
    "TaskNotification",
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

        notificationType: {
            type: DataTypes.ENUM(
                "WEEK",
                "THREE_DAYS"
            ),
            allowNull: false
        },

        sentAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: "task_notifications",
        timestamps: true
    }
);

module.exports = TaskNotification;