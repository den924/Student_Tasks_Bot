const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Subject = sequelize.define(
    "Subject",
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
        }
    },
    {
        tableName: "subjects",
        timestamps: true
    }
);

module.exports = Subject;