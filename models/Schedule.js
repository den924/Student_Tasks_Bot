const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Schedule = sequelize.define(
    "Schedule",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        groupId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        subjectId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        dayOfWeek: {
            type: DataTypes.TINYINT,
            allowNull: false,

            validate: {
                min: 1,
                max: 7
            }
        },

        lessonNumber: {
            type: DataTypes.TINYINT,
            allowNull: false,

            validate: {
                min: 1
            }
        },

        startTime: {
            type: DataTypes.TIME,
            allowNull: false
        },

        endTime: {
            type: DataTypes.TIME,
            allowNull: false
        },

        teacher: {
            type: DataTypes.STRING(255),
            allowNull: true
        },

        room: {
            type: DataTypes.STRING(50),
            allowNull: true
        }
    },
    {
        tableName: "schedules",
        timestamps: true
    }
);

module.exports = Schedule;