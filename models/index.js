const User = require("./User");
const Group = require("./Group");
const GroupMember = require("./GroupMember");
const GroupRequest = require("./GroupRequest");
const Subject = require("./Subject");

const Task = require("./Task");
const TaskMember = require("./TaskMember");
const TaskRequest = require("./TaskRequest");
const TaskNotification = require("./TaskNotification");

const Schedule = require("./Schedule");


// ==========================================
// USER ↔ GROUP MEMBER
// ==========================================

User.hasMany(GroupMember, {
    foreignKey: "userId",
    as: "groupMemberships"
});

GroupMember.belongsTo(User, {
    foreignKey: "userId",
    as: "user"
});


// ==========================================
// GROUP ↔ GROUP MEMBER
// ==========================================

Group.hasMany(GroupMember, {
    foreignKey: "groupId",
    as: "members"
});

GroupMember.belongsTo(Group, {
    foreignKey: "groupId",
    as: "group"
});


// ==========================================
// USER ↔ GROUP REQUEST
// ==========================================

User.hasMany(GroupRequest, {
    foreignKey: "userId",
    as: "groupRequests"
});

GroupRequest.belongsTo(User, {
    foreignKey: "userId",
    as: "user"
});


// ==========================================
// GROUP ↔ SUBJECT
// ==========================================

Group.hasMany(Subject, {
    foreignKey: "groupId",
    as: "subjects"
});

Subject.belongsTo(Group, {
    foreignKey: "groupId",
    as: "group"
});


// ==========================================
// GROUP ↔ TASK
// ==========================================

Group.hasMany(Task, {
    foreignKey: "groupId",
    as: "tasks"
});

Task.belongsTo(Group, {
    foreignKey: "groupId",
    as: "group"
});


// ==========================================
// SUBJECT ↔ TASK
// ==========================================

Subject.hasMany(Task, {
    foreignKey: "subjectId",
    as: "tasks"
});

Task.belongsTo(Subject, {
    foreignKey: "subjectId",
    as: "subject"
});


// ==========================================
// USER ↔ TASK
// ==========================================

User.hasMany(Task, {
    foreignKey: "creatorId",
    as: "createdTasks"
});

Task.belongsTo(User, {
    foreignKey: "creatorId",
    as: "creator"
});


// ==========================================
// TASK ↔ TASK MEMBER
// ==========================================

Task.hasMany(TaskMember, {
    foreignKey: "taskId",
    as: "members"
});

TaskMember.belongsTo(Task, {
    foreignKey: "taskId",
    as: "task"
});


// ==========================================
// USER ↔ TASK MEMBER
// ==========================================

User.hasMany(TaskMember, {
    foreignKey: "userId",
    as: "taskAssignments"
});

TaskMember.belongsTo(User, {
    foreignKey: "userId",
    as: "user"
});


// ==========================================
// USER ↔ TASK REQUEST
// ==========================================

User.hasMany(TaskRequest, {
    foreignKey: "creatorId",
    as: "taskRequests"
});

TaskRequest.belongsTo(User, {
    foreignKey: "creatorId",
    as: "creator"
});


// ==========================================
// GROUP ↔ TASK REQUEST
// ==========================================

Group.hasMany(TaskRequest, {
    foreignKey: "groupId",
    as: "taskRequests"
});

TaskRequest.belongsTo(Group, {
    foreignKey: "groupId",
    as: "group"
});


// ==========================================
// SUBJECT ↔ TASK REQUEST
// ==========================================

Subject.hasMany(TaskRequest, {
    foreignKey: "subjectId",
    as: "taskRequests"
});

TaskRequest.belongsTo(Subject, {
    foreignKey: "subjectId",
    as: "subject"
});


// ==========================================
// TASK ↔ TASK NOTIFICATION
// ==========================================

Task.hasMany(TaskNotification, {
    foreignKey: "taskId",
    as: "notifications"
});

TaskNotification.belongsTo(Task, {
    foreignKey: "taskId",
    as: "task"
});


// ==========================================
// USER ↔ TASK NOTIFICATION
// ==========================================

User.hasMany(TaskNotification, {
    foreignKey: "userId",
    as: "taskNotifications"
});

TaskNotification.belongsTo(User, {
    foreignKey: "userId",
    as: "user"
});


// ==========================================
// GROUP ↔ SCHEDULE
// ==========================================

Group.hasMany(Schedule, {
    foreignKey: "groupId",
    as: "schedules"
});

Schedule.belongsTo(Group, {
    foreignKey: "groupId",
    as: "group"
});


// ==========================================
// SUBJECT ↔ SCHEDULE
// ==========================================

Subject.hasMany(Schedule, {
    foreignKey: "subjectId",
    as: "schedules"
});

Schedule.belongsTo(Subject, {
    foreignKey: "subjectId",
    as: "subject"
});


// ==========================================
// ЭКСПОРТ МОДЕЛЕЙ
// ==========================================

module.exports = {
    User,
    Group,
    GroupMember,
    GroupRequest,
    Subject,

    Task,
    TaskMember,
    TaskRequest,
    TaskNotification,

    Schedule
};