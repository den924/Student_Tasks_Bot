const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SubjectRequest = sequelize.define(
    "SubjectRequest",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        name: {
            type: DataTypes.STRING,
            allowNull: false
        },

        groupId: {
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
        tableName: "subject_requests",
        timestamps: true
    }
);

module.exports = SubjectRequest;