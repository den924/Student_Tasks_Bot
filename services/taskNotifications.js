const cron = require("node-cron");

const {
    Task,
    TaskMember,
    TaskNotification,
    Subject
} = require("../models");


// ==========================================
// ПРОВЕРКА УВЕДОМЛЕНИЙ
// ==========================================

async function checkTaskNotifications(bot) {

    try {

        const now = new Date();

        const tasks = await Task.findAll({
            where: {
                deadline: {
                    [require("sequelize").Op.gt]: now
                }
            },
            include: [
                {
                    model: Subject,
                    as: "subject"
                },
                {
                    model: TaskMember,
                    as: "members"
                }
            ]
        });


        for (const task of tasks) {

            const deadline =
                new Date(task.deadline);

            const millisecondsLeft =
                deadline.getTime() -
                now.getTime();

            const daysLeft =
                millisecondsLeft /
                (1000 * 60 * 60 * 24);


            // ==========================================
            // УВЕДОМЛЕНИЕ ЗА НЕДЕЛЮ
            // ==========================================

            if (
                daysLeft <= 7 &&
                daysLeft > 3
            ) {

                await sendNotification(
                    bot,
                    task,
                    "WEEK"
                );
            }


            // ==========================================
            // УВЕДОМЛЕНИЯ ЗА 3 ДНЯ И МЕНЬШЕ
            // ==========================================

            if (
                daysLeft <= 3 &&
                daysLeft > 0
            ) {

                await sendNotification(
                    bot,
                    task,
                    "THREE_DAYS"
                );
            }

        }

    } catch (error) {

        console.error(
            "❌ Ошибка проверки уведомлений:",
            error
        );

    }
}


// ==========================================
// ОТПРАВКА УВЕДОМЛЕНИЯ
// ==========================================

async function sendNotification(
    bot,
    task,
    notificationType
) {

    try {

        for (
            const taskMember
            of task.members
        ) {

            // Выполненные задачи не уведомляем

            if (
                taskMember.completed
            ) {
                continue;
            }


            // Проверяем, отправляли ли
            // уже такое уведомление

            const existingNotification =
                await TaskNotification.findOne({

                    where: {

                        taskId:
                            task.id,

                        userId:
                            taskMember.userId,

                        notificationType:
                            notificationType

                    }

                });


            if (existingNotification) {
                continue;
            }


            // Получаем пользователя

            const {
                User
            } = require("../models");


            const user =
                await User.findByPk(
                    taskMember.userId
                );


            if (!user) {
                continue;
            }


            let message;


            if (
                notificationType ===
                "WEEK"
            ) {

                message =
                    `🔔 Напоминание о задаче!\n\n` +

                    `📝 ${task.title}\n` +

                    `📚 ${task.subject?.name || "Без предмета"}\n\n` +

                    `📅 Дедлайн:\n` +

                    `${formatDate(task.deadline)}\n\n` +

                    `⏳ До дедлайна осталось около недели.`;

            } else {

                const daysLeft =
                    Math.ceil(

                        (
                            new Date(
                                task.deadline
                            ).getTime() -
                            Date.now()
                        ) /
                        (1000 * 60 * 60 * 24)

                    );


                message =
                    `⚠️ Приближается дедлайн!\n\n` +

                    `📝 ${task.title}\n` +

                    `📚 ${task.subject?.name || "Без предмета"}\n\n` +

                    `📅 Дедлайн:\n` +

                    `${formatDate(task.deadline)}\n\n` +

                    `⏳ Осталось дней: ${daysLeft}`;
            }


            try {

                await bot.sendMessage(
                    user.telegramId,
                    message
                );


                await TaskNotification.create({

                    taskId:
                        task.id,

                    userId:
                        taskMember.userId,

                    notificationType:
                        notificationType,

                    sentAt:
                        new Date()

                });


                console.log(

                    `🔔 Отправлено уведомление ` +
                    `${notificationType} ` +
                    `пользователю ${user.telegramId} ` +
                    `по задаче №${task.id}`

                );


            } catch (sendError) {

                console.error(

                    `❌ Не удалось отправить уведомление ` +
                    `пользователю ${user.telegramId}:`,

                    sendError.message

                );

            }

        }

    } catch (error) {

        console.error(
            "❌ Ошибка отправки уведомления:",
            error
        );

    }
}


// ==========================================
// ФОРМАТ ДАТЫ
// ==========================================

function formatDate(date) {

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const year =
        date.getFullYear();


    const hours =
        String(
            date.getHours()
        ).padStart(
            2,
            "0"
        );


    const minutes =
        String(
            date.getMinutes()
        ).padStart(
            2,
            "0"
        );


    return (
        `${day}.${month}.${year} ` +
        `${hours}:${minutes}`
    );
}


// ==========================================
// ЗАПУСК ПЛАНИРОВЩИКА
// ==========================================

function startTaskNotificationScheduler(bot) {

    console.log(
        "⏰ Планировщик уведомлений запущен."
    );


    // Проверяем задачи каждый час

    cron.schedule(
        "0 * * * *",
        async () => {

            console.log(
                "🔎 Проверка дедлайнов..."
            );

            await checkTaskNotifications(
                bot
            );

        }
    );

}


module.exports = {
    startTaskNotificationScheduler,
    checkTaskNotifications
};