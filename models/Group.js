const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Group = sequelize.define(
    "Group",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        }
    },
    {
        tableName: "groups",
        timestamps: true
    }
);

module.exports = Group;