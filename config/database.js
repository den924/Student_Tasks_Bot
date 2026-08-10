const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: "mysql",

        logging: false
    }
);

async function connectDatabase() {
    try {
        await sequelize.authenticate();
        console.log("✅ Подключение к MySQL успешно!");
    } catch (error) {
        console.error("❌ Ошибка подключения к MySQL:");
        console.error(error.message);
    }
}

module.exports = {
    sequelize,
    connectDatabase
};