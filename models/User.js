const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const User = sequelize.define(
    "User",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        telegramId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            unique: true
        },

        username: {
            type: DataTypes.STRING,
            allowNull: true
        },

        firstName: {
            type: DataTypes.STRING,
            allowNull: true
        },

        lastName: {
            type: DataTypes.STRING,
            allowNull: true
        },

        role: {
            type: DataTypes.ENUM(
                "USER",
                "ADMIN"
            ),
            allowNull: false,
            defaultValue: "USER"
        }
    },
    {
        tableName: "users",
        timestamps: true
    }
);

module.exports = User;