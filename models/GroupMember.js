const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const GroupMember = sequelize.define(
    "GroupMember",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        groupId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        role: {
            type: DataTypes.ENUM(
                "MEMBER",
                "CURATOR"
            ),
            allowNull: false,
            defaultValue: "MEMBER"
        }
    },
    {
        tableName: "group_members",
        timestamps: true
    }
);

module.exports = GroupMember;