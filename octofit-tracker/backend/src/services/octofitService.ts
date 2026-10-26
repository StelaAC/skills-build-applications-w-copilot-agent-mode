import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Activity input must be an object'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  const isObjectId = (value: unknown): value is string => typeof value === 'string' && /^[\da-f]{24}$/i.test(value);
  if (!isObjectId(userId) || !isObjectId(teamId) || typeof type !== 'string' || !type.trim() || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw Object.assign(new Error('Activity input is invalid'), { status: 400 });
  }

  const [userExists, teamExists] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!userExists || !teamExists) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 404 });
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().populate('members', 'name').lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Team input must be an object'), { status: 400 });
  }

  const { name, mascot, members } = input as Record<string, unknown>;
  const isObjectId = (value: unknown): value is string => typeof value === 'string' && /^[\da-f]{24}$/i.test(value);
  if (typeof name !== 'string' || !name.trim() || typeof mascot !== 'string' || !mascot.trim()) {
    throw Object.assign(new Error('Team name and mascot are required'), { status: 400 });
  }

  const memberIds = members ?? [];
  if (!Array.isArray(memberIds) || !memberIds.every(isObjectId)) {
    throw Object.assign(new Error('Team members must be valid user IDs'), { status: 400 });
  }
  const uniqueMemberIds = [...new Set(memberIds.map((memberId) => memberId.toLowerCase()))];

  if (uniqueMemberIds.length > 0) {
    const existingMembers = await User.find({ _id: { $in: uniqueMemberIds } }).select('_id team').lean();
    if (existingMembers.length !== uniqueMemberIds.length) {
      throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
    }
    if (existingMembers.some((member) => member.team)) {
      throw Object.assign(new Error('One or more users already belong to a team'), { status: 409 });
    }
  }

  const team = await Team.create({ name, mascot, members: uniqueMemberIds });
  if (uniqueMemberIds.length === 0) return team;

  try {
    const assignment = await User.updateMany(
      { _id: { $in: uniqueMemberIds }, $or: [{ team: { $exists: false } }, { team: null }] },
      { $set: { team: team._id } },
    );
    if (assignment.matchedCount !== uniqueMemberIds.length) {
      throw Object.assign(new Error('One or more users already belong to a team'), { status: 409 });
    }
  } catch (error) {
    await Promise.all([
      User.updateMany({ _id: { $in: uniqueMemberIds }, team: team._id }, { $unset: { team: 1 } }),
      Team.deleteOne({ _id: team._id }),
    ]);
    throw error;
  }

  return team;
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('_id name').lean(),
    Activity.aggregate([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);

  const pointsByTeam = new Map<string, number>();
  for (const total of totals) {
    pointsByTeam.set(String(total._id), total.totalPoints);
  }

  return teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: pointsByTeam.get(String(team._id)) ?? 0,
    }))
    .sort((first, second) => second.totalPoints - first.totalPoints || first.teamName.localeCompare(second.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }

  const [recentActivity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find().lean(),
  ]);
  const activityFocus: Record<string, string> = {
    run: 'endurance',
    cycle: 'endurance',
    walk: 'endurance',
    strength: 'strength',
  };
  const goal = user.fitnessGoal.trim().toLowerCase();
  const recentFocus = recentActivity ? activityFocus[recentActivity.type.toLowerCase()] : undefined;

  return workouts
    .map((workout) => {
      const focus = workout.focus.toLowerCase();
      const matchesGoal = focus === goal;
      const matchesActivity = recentFocus !== undefined && focus === recentFocus;
      const reason = matchesGoal
        ? `Matches your ${user.fitnessGoal} goal.`
        : matchesActivity && recentActivity
          ? `Recommended based on your recent ${recentActivity.type} activity.`
          : `A complementary option for your ${user.fitnessGoal} goal.`;

      return { workout, reason, priority: matchesGoal ? 0 : matchesActivity ? 1 : 2 };
    })
    .sort((first, second) => first.priority - second.priority)
    .map(({ workout, reason }) => ({ ...workout, reason }));
}

export { User };
