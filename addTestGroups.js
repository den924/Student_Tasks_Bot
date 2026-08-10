const { sequelize, connectDatabase } = require("./config/database");
const { Group } = require("./models");

async function addGroups() {
    try {
        await connectDatabase();

        const groups = [
            "ИВТ-21",
            "ИВТ-22",
            "ЭЭ-21",
            "ЭЭ-22",
            "КБ-21",
            "КБ-22"
        ];

        for (const groupName of groups) {
            const [group, created] = await Group.findOrCreate({
                where: {
                    name: groupName
                }
            });

            if (created) {
                console.log(`✅ Добавлена группа: ${group.name}`);
            } else {
                console.log(`ℹ️ Группа уже существует: ${group.name}`);
            }
        }

        console.log("✅ Тестовые группы добавлены!");
    } catch (error) {
        console.error("❌ Ошибка:");
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

addGroups();