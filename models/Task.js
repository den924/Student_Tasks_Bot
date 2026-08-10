const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Task = sequelize.define(
    "Task",
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

        targetType: {
            type: DataTypes.ENUM(
                "PERSONAL",
                "GROUP"
            ),
            allowNull: false,
            defaultValue: "PERSONAL"
        }
    },
    {
        tableName: "tasks",
        timestamps: true
    }
);

module.exports = Task;