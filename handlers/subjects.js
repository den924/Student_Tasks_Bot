const {
    User,
    Group,
    GroupMember,
    Subject
} = require("../models");


function getSelectedGroup(telegramId) {

    if (!global.selectedGroups) {
        global.selectedGroups = new Map();
    }

    return global.selectedGroups.get(
        telegramId
    );
}


function registerSubjectHandlers(bot) {

    // ==========================================
    // ОТКРЫТИЕ ПРЕДМЕТОВ
    // ==========================================

    bot.on("callback_query", async (query) => {

        if (query.data !== "group_subjects") {
            return;
        }

        try {

            const telegramId = query.from.id;

            const groupId = getSelectedGroup(
                telegramId
            );

            if (!groupId) {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Сначала выберите группу",
                        show_alert: true
                    }
                );

                return;
            }

            const group = await Group.findByPk(
                groupId
            );

            if (!group) {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Группа не найдена",
                        show_alert: true
                    }
                );

                return;
            }


            const subjects = await Subject.findAll({
                where: {
                    groupId: group.id
                },
                order: [
                    ["name", "ASC"]
                ]
            });


            await bot.answerCallbackQuery(
                query.id
            );


            const keyboard = [];


            for (const subject of subjects) {

                keyboard.push([
                    {
                        text: `📚 ${subject.name}`,
                        callback_data:
                            `subject_${subject.id}`
                    }
                ]);
            }


            // Проверяем роль пользователя
            const user = await User.findOne({
                where: {
                    telegramId: telegramId
                }
            });


            let isCurator = false;

            if (user) {

                const membership =
                    await GroupMember.findOne({
                        where: {
                            userId: user.id,
                            groupId: group.id
                        }
                    });

                if (
                    membership &&
                    membership.role === "CURATOR"
                ) {
                    isCurator = true;
                }
            }


            // Куратор может добавлять предметы
            if (isCurator) {

                keyboard.push([
                    {
                        text: "➕ Добавить предмет",
                        callback_data: "add_subject"
                    }
                ]);

            }


            if (subjects.length === 0) {

                await bot.sendMessage(
                    query.message.chat.id,
                    `📚 В группе «${group.name}» пока нет предметов.`,
                    {
                        reply_markup: {
                            inline_keyboard: keyboard
                        }
                    }
                );

                return;
            }


            await bot.sendMessage(
                query.message.chat.id,
                `📚 Предметы группы «${group.name}»:`,
                {
                    reply_markup: {
                        inline_keyboard: keyboard
                    }
                }
            );


        } catch (error) {

            console.error(
                "❌ Ошибка загрузки предметов:",
                error
            );

            await bot.answerCallbackQuery(
                query.id,
                {
                    text: "Ошибка загрузки предметов",
                    show_alert: true
                }
            );
        }
    });


    // ==========================================
    // ВЫБОР ПРЕДМЕТА
    // ==========================================

    bot.on("callback_query", async (query) => {

        if (!query.data.startsWith("subject_")) {
            return;
        }

        const subjectId = Number(
            query.data.replace(
                "subject_",
                ""
            )
        );

        try {

            const subject = await Subject.findByPk(
                subjectId
            );

            if (!subject) {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Предмет не найден"
                    }
                );

                return;
            }

            await bot.answerCallbackQuery(
                query.id,
                {
                    text: subject.name
                }
            );

            await bot.sendMessage(
                query.message.chat.id,
                `📚 Предмет: ${subject.name}\n\n` +
                `Здесь будут отображаться задачи по этому предмету.`
            );

        } catch (error) {

            console.error(
                "❌ Ошибка выбора предмета:",
                error
            );

            await bot.answerCallbackQuery(
                query.id,
                {
                    text: "Ошибка",
                    show_alert: true
                }
            );
        }
    });


    // ==========================================
    // ДОБАВЛЕНИЕ ПРЕДМЕТА
    // ==========================================

    bot.on("callback_query", async (query) => {

        if (query.data !== "add_subject") {
            return;
        }

        try {

            const telegramId = query.from.id;

            const groupId = getSelectedGroup(
                telegramId
            );

            if (!groupId) {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Сначала выберите группу",
                        show_alert: true
                    }
                );

                return;
            }

            const user = await User.findOne({
                where: {
                    telegramId: telegramId
                }
            });

            if (!user) {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Пользователь не найден",
                        show_alert: true
                    }
                );

                return;
            }


            const membership =
                await GroupMember.findOne({
                    where: {
                        userId: user.id,
                        groupId: groupId
                    }
                });


            if (
                !membership ||
                membership.role !== "CURATOR"
            ) {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Добавлять предметы может только куратор",
                        show_alert: true
                    }
                );

                return;
            }


            await bot.answerCallbackQuery(
                query.id
            );


            await bot.sendMessage(
                query.message.chat.id,
                "Введите название нового предмета:"
            );


            if (!global.waitingForSubjectName) {
                global.waitingForSubjectName = new Set();
            }

            global.waitingForSubjectName.add(
                telegramId
            );


        } catch (error) {

            console.error(
                "❌ Ошибка добавления предмета:",
                error
            );
        }
    });


    // ==========================================
    // ПОЛУЧЕНИЕ НАЗВАНИЯ ПРЕДМЕТА
    // ==========================================

    bot.on("message", async (msg) => {

        const telegramId = msg.from.id;
        const text = msg.text;

        if (
            !global.waitingForSubjectName ||
            !global.waitingForSubjectName.has(telegramId)
        ) {
            return;
        }

        if (!text) {
            return;
        }


        if (text === "❌ Отмена") {

            global.waitingForSubjectName.delete(
                telegramId
            );

            await bot.sendMessage(
                msg.chat.id,
                "Добавление предмета отменено."
            );

            return;
        }


        const subjectName = text.trim();

        if (subjectName.length < 2) {

            await bot.sendMessage(
                msg.chat.id,
                "Название предмета слишком короткое."
            );

            return;
        }


        try {

            const groupId = getSelectedGroup(
                telegramId
            );

            if (!groupId) {

                global.waitingForSubjectName.delete(
                    telegramId
                );

                await bot.sendMessage(
                    msg.chat.id,
                    "Группа не выбрана."
                );

                return;
            }


            const existingSubject =
                await Subject.findOne({
                    where: {
                        name: subjectName,
                        groupId: groupId
                    }
                });


            if (existingSubject) {

                await bot.sendMessage(
                    msg.chat.id,
                    "Такой предмет уже существует в этой группе."
                );

                return;
            }


            const subject = await Subject.create({
                name: subjectName,
                groupId: groupId
            });


            global.waitingForSubjectName.delete(
                telegramId
            );


            await bot.sendMessage(
                msg.chat.id,
                `✅ Предмет «${subject.name}» добавлен.`
            );


            console.log(
                `📚 Добавлен предмет "${subject.name}" для группы ${groupId}`
            );


        } catch (error) {

            console.error(
                "❌ Ошибка создания предмета:",
                error
            );

            await bot.sendMessage(
                msg.chat.id,
                "Не удалось добавить предмет."
            );
        }
    });
}


module.exports = registerSubjectHandlers;