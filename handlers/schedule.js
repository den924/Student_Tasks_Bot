const {
    User,
    Group,
    GroupMember,
    Subject,
    Schedule
} = require("../models");

const {
    sendGroupMenu
} = require("./groupSelection");


// ==========================================
// СОСТОЯНИЯ СОЗДАНИЯ / РЕДАКТИРОВАНИЯ
// ==========================================

const scheduleState = new Map();


// ==========================================
// ПОЛУЧЕНИЕ ВЫБРАННОЙ ГРУППЫ
// ==========================================

function getSelectedGroup(telegramId) {

    if (!global.selectedGroups) {
        global.selectedGroups = new Map();
    }

    return global.selectedGroups.get(
        telegramId
    );
}


// ==========================================
// ДНИ НЕДЕЛИ
// ==========================================

const daysOfWeek = {
    1: "Понедельник",
    2: "Вторник",
    3: "Среда",
    4: "Четверг",
    5: "Пятница",
    6: "Суббота",
    7: "Воскресенье"
};


// ==========================================
// СОКРАЩЁННЫЕ НАЗВАНИЯ
// ==========================================

const shortDaysOfWeek = {
    1: "Пн",
    2: "Вт",
    3: "Ср",
    4: "Чт",
    5: "Пт",
    6: "Сб",
    7: "Вс"
};


// ==========================================
// ПРОВЕРКА КУРАТОРА
// ==========================================

async function isCurator(
    telegramId,
    groupId
) {

    const user =
        await User.findOne({
            where: {
                telegramId:
                    telegramId
            }
        });

    if (!user) {
        return false;
    }

    const membership =
        await GroupMember.findOne({
            where: {
                userId:
                    user.id,

                groupId:
                    groupId
            }
        });

    return (
        membership &&
        membership.role === "CURATOR"
    );
}


// ==========================================
// ОЧИСТКА СОСТОЯНИЯ
// ==========================================

function clearScheduleState(
    telegramId
) {

    scheduleState.delete(
        telegramId
    );
}


// ==========================================
// МЕНЮ РАСПИСАНИЯ
// ==========================================

async function sendScheduleMenu(
    bot,
    chatId,
    telegramId
) {

    const groupId =
        getSelectedGroup(
            telegramId
        );

    if (!groupId) {

        await bot.sendMessage(
            chatId,
            "❌ Сначала выберите группу."
        );

        return;
    }


    const group =
        await Group.findByPk(
            groupId
        );


    if (!group) {

        await bot.sendMessage(
            chatId,
            "❌ Группа не найдена."
        );

        return;
    }


    const curator =
        await isCurator(
            telegramId,
            groupId
        );


    const keyboard = [];


    keyboard.push([
        {
            text: "📅 Понедельник",
            callback_data: "schedule_day_1"
        }
    ]);

    keyboard.push([
        {
            text: "📅 Вторник",
            callback_data: "schedule_day_2"
        }
    ]);

    keyboard.push([
        {
            text: "📅 Среда",
            callback_data: "schedule_day_3"
        }
    ]);

    keyboard.push([
        {
            text: "📅 Четверг",
            callback_data: "schedule_day_4"
        }
    ]);

    keyboard.push([
        {
            text: "📅 Пятница",
            callback_data: "schedule_day_5"
        }
    ]);

    keyboard.push([
        {
            text: "📅 Суббота",
            callback_data: "schedule_day_6"
        }
    ]);


    // ==========================================
    // КНОПКИ КУРАТОРА
    // ==========================================

    if (curator) {

        keyboard.push([
            {
                text: "➕ Добавить пару",
                callback_data: "schedule_add"
            }
        ]);

        keyboard.push([
            {
                text: "✏️ Изменить пару",
                callback_data: "schedule_edit"
            }
        ]);

        keyboard.push([
            {
                text: "🗑 Удалить пару",
                callback_data: "schedule_delete"
            }
        ]);
    }


    keyboard.push([
        {
            text: "↩️ Назад к группе",
            callback_data: "schedule_back_group"
        }
    ]);


    await bot.sendMessage(

        chatId,

        `📅 Расписание группы «${group.name}»\n\n` +
        `Выберите день или действие:`,

        {
            reply_markup: {
                inline_keyboard:
                    keyboard
            }
        }

    );
}


// ==========================================
// ПОКАЗ РАСПИСАНИЯ ДНЯ
// ==========================================

async function showScheduleDay(
    bot,
    chatId,
    telegramId,
    day
) {

    const groupId =
        getSelectedGroup(
            telegramId
        );


    if (!groupId) {

        await bot.sendMessage(
            chatId,
            "❌ Сначала выберите группу."
        );

        return;
    }


    const group =
        await Group.findByPk(
            groupId
        );


    if (!group) {

        await bot.sendMessage(
            chatId,
            "❌ Группа не найдена."
        );

        return;
    }


    const lessons =
        await Schedule.findAll({

            where: {
                groupId:
                    groupId,

                dayOfWeek:
                    day
            },

            include: [
                {
                    model:
                        Subject,

                    as:
                        "subject"
                }
            ],

            order: [
                [
                    "lessonNumber",
                    "ASC"
                ]
            ]

        });


    let message =
        `📅 ${daysOfWeek[day]}\n` +
        `🏫 Группа: ${group.name}\n\n`;


    if (lessons.length === 0) {

        message +=
            "На этот день пар нет.";

    } else {

        for (
            const lesson
            of lessons
        ) {

            message +=
                `${lesson.lessonNumber}. ` +
                `${lesson.startTime.slice(0, 5)}–` +
                `${lesson.endTime.slice(0, 5)}\n`;

            message +=
                `📚 ${lesson.subject?.name || "Предмет удалён"}\n`;

            if (lesson.teacher) {

                message +=
                    `👨‍🏫 ${lesson.teacher}\n`;
            }

            if (lesson.room) {

                message +=
                    `🚪 Аудитория: ${lesson.room}\n`;
            }

            message += "\n";
        }
    }


    await bot.sendMessage(

        chatId,

        message,

        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "↩️ К расписанию",
                            callback_data:
                                "schedule_menu"
                        }
                    ]
                ]
            }
        }

    );
}


// ==========================================
// КЛАВИАТУРА ОТМЕНЫ
// ==========================================

async function sendScheduleCancelKeyboard(
    bot,
    chatId
) {

    await bot.sendMessage(

        chatId,

        "❌ Для отмены текущего действия нажмите кнопку:",

        {
            reply_markup: {
                keyboard: [
                    [
                        "❌ Отмена"
                    ]
                ],

                resize_keyboard:
                    true
            }
        }

    );
}


// ==========================================
// ВЫБОР ПРЕДМЕТА
// ==========================================

async function sendScheduleSubjectSelection(
    bot,
    chatId,
    telegramId
) {

    const state =
        scheduleState.get(
            telegramId
        );


    if (!state) {
        return;
    }


    const subjects =
        await Subject.findAll({

            where: {
                groupId:
                    state.groupId
            },

            order: [
                [
                    "name",
                    "ASC"
                ]
            ]

        });


    if (subjects.length === 0) {

        clearScheduleState(
            telegramId
        );

        await bot.sendMessage(

            chatId,

            "📚 В выбранной группе пока нет предметов.\n\n" +
            "Сначала добавьте предмет."

        );

        return;
    }


    const keyboard =
        subjects.map(
            (subject) => [

                {
                    text:
                        `📚 ${subject.name}`,

                    callback_data:
                        `schedule_subject_${subject.id}`
                }

            ]
        );


    keyboard.push([

        {
            text:
                "❌ Отмена",

            callback_data:
                "schedule_cancel"
        }

    ]);


    await bot.sendMessage(

        chatId,

        "📚 Выберите предмет для пары:",

        {
            reply_markup: {
                inline_keyboard:
                    keyboard
            }
        }

    );
}


// ==========================================
// ВЫБОР ДНЯ
// ==========================================

async function sendDaySelection(
    bot,
    chatId
) {

    await bot.sendMessage(

        chatId,

        "📅 Выберите день недели:",

        {
            reply_markup: {
                inline_keyboard: [

                    [
                        {
                            text: "Понедельник",
                            callback_data:
                                "schedule_add_day_1"
                        }
                    ],

                    [
                        {
                            text: "Вторник",
                            callback_data:
                                "schedule_add_day_2"
                        }
                    ],

                    [
                        {
                            text: "Среда",
                            callback_data:
                                "schedule_add_day_3"
                        }
                    ],

                    [
                        {
                            text: "Четверг",
                            callback_data:
                                "schedule_add_day_4"
                        }
                    ],

                    [
                        {
                            text: "Пятница",
                            callback_data:
                                "schedule_add_day_5"
                        }
                    ],

                    [
                        {
                            text: "Суббота",
                            callback_data:
                                "schedule_add_day_6"
                        }
                    ],

                    [
                        {
                            text: "❌ Отмена",
                            callback_data:
                                "schedule_cancel"
                        }
                    ]

                ]
            }
        }

    );
}


// ==========================================
// ВЫБОР СУЩЕСТВУЮЩЕЙ ПАРЫ
// ==========================================

async function sendScheduleLessonSelection(
    bot,
    chatId,
    telegramId,
    action
) {

    const groupId =
        getSelectedGroup(
            telegramId
        );


    const lessons =
        await Schedule.findAll({

            where: {
                groupId:
                    groupId
            },

            include: [
                {
                    model:
                        Subject,

                    as:
                        "subject"
                }
            ],

            order: [

                [
                    "dayOfWeek",
                    "ASC"
                ],

                [
                    "lessonNumber",
                    "ASC"
                ]

            ]

        });


    if (lessons.length === 0) {

        await bot.sendMessage(

            chatId,

            "📅 В расписании пока нет ни одной пары.",

            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text:
                                    "↩️ К расписанию",

                                callback_data:
                                    "schedule_menu"
                            }
                        ]
                    ]
                }
            }

        );

        return;
    }


    const keyboard = [];


    for (
        const lesson
        of lessons
    ) {

        keyboard.push([

            {
                text:
                    `${shortDaysOfWeek[lesson.dayOfWeek]} ` +
                    `${lesson.lessonNumber}. ` +
                    `${lesson.subject?.name || "Предмет"} ` +
                    `(${lesson.startTime.slice(0, 5)})`,

                callback_data:
                    `schedule_${action}_lesson_${lesson.id}`
            }

        ]);

    }


    keyboard.push([

        {
            text:
                "❌ Отмена",

            callback_data:
                "schedule_cancel"
        }

    ]);


    await bot.sendMessage(

        chatId,

        action === "edit"

            ? "✏️ Выберите пару, которую хотите изменить:"

            : "🗑 Выберите пару, которую хотите удалить:",

        {
            reply_markup: {
                inline_keyboard:
                    keyboard
            }
        }

    );
}


// ==========================================
// РЕГИСТРАЦИЯ ОБРАБОТЧИКОВ
// ==========================================

function registerScheduleHandlers(bot) {

    bot.on(
        "callback_query",
        async (query) => {

            const data =
                query.data || "";

            const telegramId =
                query.from.id;

            const chatId =
                query.message?.chat?.id;


            // ==========================================
            // ОТКРЫТИЕ РАСПИСАНИЯ
            // ==========================================

            if (
                data ===
                "group_schedule"
                ||
                data ===
                "schedule_menu"
            ) {

                try {

                    clearScheduleState(
                        telegramId
                    );

                    await bot.answerCallbackQuery(
                        query.id
                    );

                    await sendScheduleMenu(
                        bot,
                        chatId,
                        telegramId
                    );

                } catch (error) {

                    console.error(
                        "❌ Ошибка открытия расписания:",
                        error
                    );

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Ошибка",
                            show_alert:
                                true
                        }
                    );
                }

                return;
            }


            // ==========================================
            // ПРОСМОТР ДНЯ
            // ==========================================

            if (
                data.startsWith(
                    "schedule_day_"
                )
            ) {

                const day =
                    Number(
                        data.replace(
                            "schedule_day_",
                            ""
                        )
                    );


                try {

                    await bot.answerCallbackQuery(
                        query.id
                    );

                    await showScheduleDay(
                        bot,
                        chatId,
                        telegramId,
                        day
                    );

                } catch (error) {

                    console.error(
                        "❌ Ошибка просмотра расписания:",
                        error
                    );
                }

                return;
            }


            // ==========================================
            // ДОБАВЛЕНИЕ ПАРЫ
            // ==========================================

            if (
                data ===
                "schedule_add"
            ) {

                try {

                    const groupId =
                        getSelectedGroup(
                            telegramId
                        );


                    if (!groupId) {

                        await bot.answerCallbackQuery(
                            query.id,
                            {
                                text:
                                    "Сначала выберите группу",
                                show_alert:
                                    true
                            }
                        );

                        return;
                    }


                    const curator =
                        await isCurator(
                            telegramId,
                            groupId
                        );


                    if (!curator) {

                        await bot.answerCallbackQuery(
                            query.id,
                            {
                                text:
                                    "Добавлять пары может только куратор",
                                show_alert:
                                    true
                            }
                        );

                        return;
                    }


                    scheduleState.set(

                        telegramId,

                        {
                            action:
                                "ADD",

                            groupId:
                                groupId,

                            step:
                                "SUBJECT"
                        }

                    );


                    await bot.answerCallbackQuery(
                        query.id
                    );


                    await sendScheduleSubjectSelection(
                        bot,
                        chatId,
                        telegramId
                    );

                } catch (error) {

                    console.error(
                        "❌ Ошибка начала добавления пары:",
                        error
                    );
                }

                return;
            }


            // ==========================================
            // РЕДАКТИРОВАНИЕ ПАРЫ
            // ==========================================

            if (
                data ===
                "schedule_edit"
            ) {

                try {

                    const groupId =
                        getSelectedGroup(
                            telegramId
                        );


                    if (!groupId) {

                        await bot.answerCallbackQuery(
                            query.id,
                            {
                                text:
                                    "Сначала выберите группу",
                                show_alert:
                                    true
                            }
                        );

                        return;
                    }


                    const curator =
                        await isCurator(
                            telegramId,
                            groupId
                        );


                    if (!curator) {

                        await bot.answerCallbackQuery(
                            query.id,
                            {
                                text:
                                    "Изменять пары может только куратор",
                                show_alert:
                                    true
                            }
                        );

                        return;
                    }


                    scheduleState.set(

                        telegramId,

                        {
                            action:
                                "EDIT_SELECT",

                            groupId:
                                groupId
                        }

                    );


                    await bot.answerCallbackQuery(
                        query.id
                    );


                    await sendScheduleLessonSelection(
                        bot,
                        chatId,
                        telegramId,
                        "edit"
                    );

                } catch (error) {

                    console.error(
                        "❌ Ошибка начала изменения пары:",
                        error
                    );
                }

                return;
            }


            // ==========================================
            // УДАЛЕНИЕ ПАРЫ
            // ==========================================

            if (
                data ===
                "schedule_delete"
            ) {

                try {

                    const groupId =
                        getSelectedGroup(
                            telegramId
                        );


                    if (!groupId) {

                        await bot.answerCallbackQuery(
                            query.id,
                            {
                                text:
                                    "Сначала выберите группу",
                                show_alert:
                                    true
                            }
                        );

                        return;
                    }


                    const curator =
                        await isCurator(
                            telegramId,
                            groupId
                        );


                    if (!curator) {

                        await bot.answerCallbackQuery(
                            query.id,
                            {
                                text:
                                    "Удалять пары может только куратор",
                                show_alert:
                                    true
                            }
                        );

                        return;
                    }


                    scheduleState.set(

                        telegramId,

                        {
                            action:
                                "DELETE_SELECT",

                            groupId:
                                groupId
                        }

                    );


                    await bot.answerCallbackQuery(
                        query.id
                    );


                    await sendScheduleLessonSelection(
                        bot,
                        chatId,
                        telegramId,
                        "delete"
                    );

                } catch (error) {

                    console.error(
                        "❌ Ошибка начала удаления пары:",
                        error
                    );
                }

                return;
            }


            // ==========================================
            // ОТМЕНА
            // ==========================================

            if (
                data ===
                "schedule_cancel"
            ) {

                clearScheduleState(
                    telegramId
                );


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "Действие отменено"
                    }

                );


                await bot.sendMessage(

                    chatId,

                    "❌ Действие отменено.",

                    {
                        reply_markup: {
                            remove_keyboard:
                                true
                        }
                    }

                );


                await sendScheduleMenu(
                    bot,
                    chatId,
                    telegramId
                );


                return;
            }


            // ==========================================
            // ВЫБОР ПРЕДМЕТА
            // ==========================================

            if (
                data.startsWith(
                    "schedule_subject_"
                )
            ) {

                const subjectId =
                    Number(
                        data.replace(
                            "schedule_subject_",
                            ""
                        )
                    );


                const state =
                    scheduleState.get(
                        telegramId
                    );


                if (!state) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Сессия истекла",
                            show_alert:
                                true
                        }
                    );

                    return;
                }


                try {

                    const subject =
                        await Subject.findByPk(
                            subjectId
                        );


                    if (!subject) {

                        await bot.answerCallbackQuery(
                            query.id,
                            {
                                text:
                                    "Предмет не найден",
                                show_alert:
                                    true
                            }
                        );

                        return;
                    }


                    state.subjectId =
                        subject.id;

                    state.subjectName =
                        subject.name;

                    state.step =
                        "DAY";


                    await bot.answerCallbackQuery(

                        query.id,

                        {
                            text:
                                `Выбран предмет: ${subject.name}`
                        }

                    );


                    await sendDaySelection(
                        bot,
                        chatId
                    );

                } catch (error) {

                    console.error(
                        "❌ Ошибка выбора предмета расписания:",
                        error
                    );
                }

                return;
            }


            // ==========================================
            // ВЫБОР ДНЯ
            // ==========================================

            if (
                data.startsWith(
                    "schedule_add_day_"
                )
            ) {

                const day =
                    Number(
                        data.replace(
                            "schedule_add_day_",
                            ""
                        )
                    );


                const state =
                    scheduleState.get(
                        telegramId
                    );


                if (!state) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Сессия истекла",
                            show_alert:
                                true
                        }
                    );

                    return;
                }


                state.dayOfWeek =
                    day;

                state.step =
                    "LESSON_NUMBER";


                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text:
                            daysOfWeek[day]
                    }
                );


                await bot.sendMessage(

                    chatId,

                    "🔢 Введите номер пары:\n\n" +
                    "Например: 1"

                );


                await sendScheduleCancelKeyboard(
                    bot,
                    chatId
                );


                return;
            }


            // ==========================================
            // ВЫБОР ПАРЫ ДЛЯ РЕДАКТИРОВАНИЯ
            // ==========================================

            if (
                data.startsWith(
                    "schedule_edit_lesson_"
                )
            ) {

                const lessonId =
                    Number(
                        data.replace(
                            "schedule_edit_lesson_",
                            ""
                        )
                    );


                const state =
                    scheduleState.get(
                        telegramId
                    );


                if (!state) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Сессия истекла"
                        }
                    );

                    return;
                }


                try {

                    const lesson =
                        await Schedule.findByPk(
                            lessonId,
                            {
                                include: [
                                    {
                                        model:
                                            Subject,

                                        as:
                                            "subject"
                                    }
                                ]
                            }
                        );


                    if (!lesson) {

                        await bot.answerCallbackQuery(
                            query.id,
                            {
                                text:
                                    "Пара не найдена"
                            }
                        );

                        return;
                    }


                    state.action =
                        "EDIT";

                    state.lessonId =
                        lesson.id;

                    state.subjectId =
                        lesson.subjectId;

                    state.subjectName =
                        lesson.subject?.name ||
                        "";

                    state.dayOfWeek =
                        lesson.dayOfWeek;

                    state.lessonNumber =
                        lesson.lessonNumber;

                    state.startTime =
                        lesson.startTime.slice(
                            0,
                            5
                        );

                    state.endTime =
                        lesson.endTime.slice(
                            0,
                            5
                        );

                    state.teacher =
                        lesson.teacher || "";

                    state.room =
                        lesson.room || "";

                    state.step =
                        "EDIT_MENU";


                    await bot.answerCallbackQuery(
                        query.id
                    );


                    await bot.sendMessage(

                        chatId,

                        `✏️ Изменение пары\n\n` +

                        `📚 ${state.subjectName}\n` +

                        `📅 ${daysOfWeek[state.dayOfWeek]}\n` +

                        `🔢 Пара №${state.lessonNumber}\n` +

                        `⏰ ${state.startTime}–${state.endTime}\n` +

                        `👨‍🏫 ${state.teacher || "Не указан"}\n` +

                        `🚪 ${state.room || "Не указана"}\n\n` +

                        `Введите новые данные.\n` +
                        `Для отмены нажмите «❌ Отмена».`

                    );


                    await sendScheduleCancelKeyboard(
                        bot,
                        chatId
                    );

                } catch (error) {

                    console.error(
                        "❌ Ошибка выбора пары для изменения:",
                        error
                    );
                }

                return;
            }


            // ==========================================
            // ВЫБОР ПАРЫ ДЛЯ УДАЛЕНИЯ
            // ==========================================

            if (
                data.startsWith(
                    "schedule_delete_lesson_"
                )
            ) {

                const lessonId =
                    Number(
                        data.replace(
                            "schedule_delete_lesson_",
                            ""
                        )
                    );


                try {

                    const lesson =
                        await Schedule.findByPk(
                            lessonId,
                            {
                                include: [
                                    {
                                        model:
                                            Subject,

                                        as:
                                            "subject"
                                    }
                                ]
                            }
                        );


                    if (!lesson) {

                        await bot.answerCallbackQuery(
                            query.id,
                            {
                                text:
                                    "Пара не найдена"
                            }
                        );

                        return;
                    }


                    const groupId =
                        getSelectedGroup(
                            telegramId
                        );


                    const curator =
                        await isCurator(
                            telegramId,
                            groupId
                        );


                    if (!curator) {

                        await bot.answerCallbackQuery(
                            query.id,
                            {
                                text:
                                    "Недостаточно прав",
                                show_alert:
                                    true
                            }
                        );

                        return;
                    }


                    await lesson.destroy();


                    clearScheduleState(
                        telegramId
                    );


                    await bot.answerCallbackQuery(

                        query.id,

                        {
                            text:
                                "Пара удалена"
                        }

                    );


                    await bot.sendMessage(

                        chatId,

                        "🗑 Пара успешно удалена.",

                        {
                            reply_markup: {
                                remove_keyboard:
                                    true
                            }
                        }

                    );


                    await sendScheduleMenu(
                        bot,
                        chatId,
                        telegramId
                    );

                } catch (error) {

                    console.error(
                        "❌ Ошибка удаления пары:",
                        error
                    );
                }

                return;
            }


            // ==========================================
            // НАЗАД К ГРУППЕ
            // ==========================================

            if (
                data ===
                "schedule_back_group"
            ) {

                clearScheduleState(
                    telegramId
                );


                await bot.answerCallbackQuery(
                    query.id
                );


                // ==========================================
                // ВОЗВРАЩАЕМСЯ В ОБЩЕЕ МЕНЮ ГРУППЫ
                // ==========================================

                await sendGroupMenu(

                    bot,

                    chatId,

                    telegramId,

                    {
                        prefix:
                            "🏫 Выбранная группа"
                    }

                );


                return;
            }

        }
    );


    // ==========================================
    // ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ
    // ==========================================

    bot.on(
        "message",
        async (msg) => {

            const text =
                msg.text;

            if (!text) {
                return;
            }


            const telegramId =
                msg.from.id;

            const chatId =
                msg.chat.id;


            const state =
                scheduleState.get(
                    telegramId
                );


            if (!state) {
                return;
            }


            // ==========================================
            // ОТМЕНА
            // ==========================================

            if (
                text ===
                "❌ Отмена"
            ) {

                clearScheduleState(
                    telegramId
                );


                await bot.sendMessage(

                    chatId,

                    "❌ Действие отменено.",

                    {
                        reply_markup: {
                            remove_keyboard:
                                true
                        }
                    }

                );


                await sendScheduleMenu(

                    bot,

                    chatId,

                    telegramId

                );


                return;
            }


            // ==========================================
            // НОМЕР ПАРЫ
            // ==========================================

            if (
                state.step ===
                "LESSON_NUMBER"
            ) {

                const lessonNumber =
                    Number(
                        text.trim()
                    );


                if (
                    !Number.isInteger(
                        lessonNumber
                    )
                    ||
                    lessonNumber < 1
                    ||
                    lessonNumber > 10
                ) {

                    await bot.sendMessage(

                        chatId,

                        "❌ Неверный номер пары.\n\n" +
                        "Введите число от 1 до 10."

                    );

                    return;
                }


                state.lessonNumber =
                    lessonNumber;

                state.step =
                    "START_TIME";


                await bot.sendMessage(

                    chatId,

                    "⏰ Введите время начала пары.\n\n" +
                    "Формат: ЧЧ:ММ\n\n" +
                    "Например: 09:00"

                );


                return;
            }


            // ==========================================
            // ВРЕМЯ НАЧАЛА
            // ==========================================

            if (
                state.step ===
                "START_TIME"
            ) {

                if (
                    !isValidTime(
                        text.trim()
                    )
                ) {

                    await bot.sendMessage(

                        chatId,

                        "❌ Неверный формат времени.\n\n" +
                        "Используйте ЧЧ:ММ.\n" +
                        "Например: 09:00"

                    );

                    return;
                }


                state.startTime =
                    text.trim();

                state.step =
                    "END_TIME";


                await bot.sendMessage(

                    chatId,

                    "⏰ Введите время окончания пары.\n\n" +
                    "Например: 10:30"

                );


                return;
            }


            // ==========================================
            // ВРЕМЯ ОКОНЧАНИЯ
            // ==========================================

            if (
                state.step ===
                "END_TIME"
            ) {

                if (
                    !isValidTime(
                        text.trim()
                    )
                ) {

                    await bot.sendMessage(

                        chatId,

                        "❌ Неверный формат времени.\n\n" +
                        "Например: 10:30"

                    );

                    return;
                }


                if (
                    text.trim() <=
                    state.startTime
                ) {

                    await bot.sendMessage(

                        chatId,

                        "❌ Время окончания должно быть позже времени начала."

                    );

                    return;
                }


                state.endTime =
                    text.trim();

                state.step =
                    "TEACHER";


                await bot.sendMessage(

                    chatId,

                    "👨‍🏫 Введите преподавателя.\n\n" +
                    "Если преподаватель неизвестен, напишите: Нет"

                );


                return;
            }


            // ==========================================
            // ПРЕПОДАВАТЕЛЬ
            // ==========================================

            if (
                state.step ===
                "TEACHER"
            ) {

                state.teacher =

                    text.trim().toLowerCase() ===
                    "нет"

                        ? null

                        : text.trim();


                state.step =
                    "ROOM";


                await bot.sendMessage(

                    chatId,

                    "🚪 Введите номер аудитории.\n\n" +
                    "Если аудитория неизвестна, напишите: Нет"

                );


                return;
            }


            // ==========================================
            // АУДИТОРИЯ
            // ==========================================

            if (
                state.step ===
                "ROOM"
            ) {

                state.room =

                    text.trim().toLowerCase() ===
                    "нет"

                        ? null

                        : text.trim();


                await createScheduleLesson(

                    bot,

                    msg,

                    telegramId,

                    state

                );


                return;
            }


            // ==========================================
            // МЕНЮ РЕДАКТИРОВАНИЯ
            // ==========================================

            if (
                state.step ===
                "EDIT_MENU"
            ) {

                state.step =
                    "EDIT_DATA";


                await bot.sendMessage(

                    chatId,

                    "✏️ Теперь введите данные новой пары.\n\n" +

                    "Формат:\n" +
                    "День | Номер | Начало | Конец | Преподаватель | Аудитория\n\n" +

                    "Пример:\n" +
                    "1 | 2 | 10:40 | 12:10 | Иванов И.И. | 305\n\n" +

                    "Если преподаватель или аудитория неизвестны — напишите «Нет»."

                );


                return;
            }


            // ==========================================
            // ДАННЫЕ РЕДАКТИРОВАНИЯ
            // ==========================================

            if (
                state.step ===
                "EDIT_DATA"
            ) {

                await updateScheduleLesson(

                    bot,

                    msg,

                    telegramId,

                    state,

                    text.trim()

                );

            }

        }
    );
}


// ==========================================
// СОЗДАНИЕ ПАРЫ
// ==========================================

async function createScheduleLesson(
    bot,
    msg,
    telegramId,
    state
) {

    try {

        const curator =
            await isCurator(
                telegramId,
                state.groupId
            );


        if (!curator) {

            clearScheduleState(
                telegramId
            );

            await bot.sendMessage(

                msg.chat.id,

                "❌ Только куратор может добавлять пары.",

                {
                    reply_markup: {
                        remove_keyboard:
                            true
                    }
                }

            );

            return;
        }


        const existingLesson =
            await Schedule.findOne({

                where: {

                    groupId:
                        state.groupId,

                    dayOfWeek:
                        state.dayOfWeek,

                    lessonNumber:
                        state.lessonNumber

                }

            });


        if (existingLesson) {

            clearScheduleState(
                telegramId
            );


            await bot.sendMessage(

                msg.chat.id,

                "❌ На этот день и номер пары уже существует занятие.",

                {
                    reply_markup: {
                        remove_keyboard:
                            true
                    }
                }

            );


            await sendScheduleMenu(
                bot,
                msg.chat.id,
                telegramId
            );

            return;
        }


        const lesson =
            await Schedule.create({

                groupId:
                    state.groupId,

                subjectId:
                    state.subjectId,

                dayOfWeek:
                    state.dayOfWeek,

                lessonNumber:
                    state.lessonNumber,

                startTime:
                    state.startTime,

                endTime:
                    state.endTime,

                teacher:
                    state.teacher,

                room:
                    state.room

            });


        clearScheduleState(
            telegramId
        );


        await bot.sendMessage(

            msg.chat.id,

            `✅ Пара успешно добавлена!\n\n` +

            `📚 ${state.subjectName}\n` +

            `📅 ${daysOfWeek[state.dayOfWeek]}\n` +

            `🔢 Пара №${state.lessonNumber}\n` +

            `⏰ ${state.startTime}–${state.endTime}\n` +

            `👨‍🏫 ${state.teacher || "Не указан"}\n` +

            `🚪 ${state.room || "Не указана"}`,

            {
                reply_markup: {
                    remove_keyboard:
                        true
                }
            }

        );


        console.log(
            `📅 Добавлена пара №${lesson.id}`
        );


        await sendScheduleMenu(

            bot,

            msg.chat.id,

            telegramId

        );


    } catch (error) {

        console.error(
            "❌ Ошибка создания пары:",
            error
        );


        clearScheduleState(
            telegramId
        );


        await bot.sendMessage(

            msg.chat.id,

            "❌ Не удалось добавить пару.",

            {
                reply_markup: {
                    remove_keyboard:
                        true
                }
            }

        );

    }

}


// ==========================================
// РЕДАКТИРОВАНИЕ ПАРЫ
// ==========================================

async function updateScheduleLesson(
    bot,
    msg,
    telegramId,
    state,
    text
) {

    try {

        const parts =
            text
                .split("|")
                .map(
                    part =>
                        part.trim()
                );


        if (
            parts.length !== 6
        ) {

            await bot.sendMessage(

                msg.chat.id,

                "❌ Неверный формат.\n\n" +

                "Используйте:\n" +
                "День | Номер | Начало | Конец | Преподаватель | Аудитория\n\n" +

                "Например:\n" +
                "1 | 2 | 10:40 | 12:10 | Иванов И.И. | 305"

            );

            return;
        }


        const day =
            Number(
                parts[0]
            );


        const lessonNumber =
            Number(
                parts[1]
            );


        const startTime =
            parts[2];


        const endTime =
            parts[3];


        const teacher =
            parts[4].toLowerCase() ===
            "нет"

                ? null

                : parts[4];


        const room =
            parts[5].toLowerCase() ===
            "нет"

                ? null

                : parts[5];


        if (
            day < 1 ||
            day > 6
        ) {

            await bot.sendMessage(

                msg.chat.id,

                "❌ День должен быть от 1 до 6."

            );

            return;
        }


        if (
            lessonNumber < 1 ||
            lessonNumber > 10
        ) {

            await bot.sendMessage(

                msg.chat.id,

                "❌ Номер пары должен быть от 1 до 10."

            );

            return;
        }


        if (
            !isValidTime(
                startTime
            )
            ||
            !isValidTime(
                endTime
            )
        ) {

            await bot.sendMessage(

                msg.chat.id,

                "❌ Неверный формат времени."

            );

            return;
        }


        if (
            endTime <=
            startTime
        ) {

            await bot.sendMessage(

                msg.chat.id,

                "❌ Время окончания должно быть позже времени начала."

            );

            return;
        }


        const curator =
            await isCurator(
                telegramId,
                state.groupId
            );


        if (!curator) {

            clearScheduleState(
                telegramId
            );

            return;
        }


        const conflict =
            await Schedule.findOne({

                where: {

                    groupId:
                        state.groupId,

                    dayOfWeek:
                        day,

                    lessonNumber:
                        lessonNumber

                }

            });


        if (
            conflict &&
            conflict.id !==
                state.lessonId
        ) {

            await bot.sendMessage(

                msg.chat.id,

                "❌ На этот день и номер пары уже существует другое занятие."

            );

            return;
        }


        await Schedule.update(

            {

                dayOfWeek:
                    day,

                lessonNumber:
                    lessonNumber,

                startTime:
                    startTime,

                endTime:
                    endTime,

                teacher:
                    teacher,

                room:
                    room

            },

            {

                where: {
                    id:
                        state.lessonId
                }

            }

        );


        clearScheduleState(
            telegramId
        );


        await bot.sendMessage(

            msg.chat.id,

            "✅ Пара успешно изменена.",

            {
                reply_markup: {
                    remove_keyboard:
                        true
                }
            }

        );


        await sendScheduleMenu(

            bot,

            msg.chat.id,

            telegramId

        );


    } catch (error) {

        console.error(
            "❌ Ошибка изменения пары:",
            error
        );


        await bot.sendMessage(

            msg.chat.id,

            "❌ Не удалось изменить пару."

        );

    }

}


// ==========================================
// ПРОВЕРКА ВРЕМЕНИ
// ==========================================

function isValidTime(
    value
) {

    const match =
        value.match(
            /^([01]\d|2[0-3]):([0-5]\d)$/
        );


    return Boolean(
        match
    );
}


// ==========================================
// ЭКСПОРТ
// ==========================================

module.exports =
    registerScheduleHandlers;