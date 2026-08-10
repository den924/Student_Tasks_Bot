function createGroupsKeyboard(groups, page, totalPages) {
    const keyboard = [];

    for (const group of groups) {
        keyboard.push([
            {
                text: `🏫 ${group.name}`,
                callback_data: `select_group_${group.id}`
            }
        ]);
    }

    const navigation = [];

    if (page > 0) {
        navigation.push({
            text: "⬅️",
            callback_data: `groups_page_${page - 1}`
        });
    }

    navigation.push({
        text: `${page + 1} / ${totalPages}`,
        callback_data: "groups_page_current"
    });

    if (page < totalPages - 1) {
        navigation.push({
            text: "➡️",
            callback_data: `groups_page_${page + 1}`
        });
    }

    keyboard.push(navigation);

    keyboard.push([
        {
            text: "➕ Добавить группу",
            callback_data: "add_group"
        }
    ]);

    keyboard.push([
        {
            text: "📋 Группы, ожидающие добавления",
            callback_data: "pending_groups"
        }
    ]);

    return {
        inline_keyboard: keyboard
    };
}

module.exports = {
    createGroupsKeyboard
};