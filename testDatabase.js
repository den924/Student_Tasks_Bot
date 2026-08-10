const { sequelize, connectDatabase } = require("./config/database");

const {
    User,
    Group,
    GroupMember,
    GroupRequest,
    Subject
} = require("./models");


async function start() {

    try {

        await connectDatabase();

        await sequelize.sync();

        console.log("✅ Таблицы и связи синхронизированы!");

    } catch (error) {

        console.error("❌ Ошибка:");
        console.error(error);

    } finally {

        await sequelize.close();

    }
}


start();