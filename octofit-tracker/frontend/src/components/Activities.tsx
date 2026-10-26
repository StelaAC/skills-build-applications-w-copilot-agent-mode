import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Activity = {
  _id?: string;
  type: string;
  minutes: number;
  points: number;
  occurredAt?: string;
};

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ activities: Activity[] }>('/api/activities')
      .then((response) => {
        if (active) setActivities(response.activities);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Activities</h2>
    <p>Track student activity minutes and points.</p>
    {loading ? <p role="status">Loading activities...</p> : error ? <p role="alert">Unable to load activities.</p> : activities.length === 0 ? <p role="status">No activities yet.</p> : <div className="table-responsive">
      <table className="table">
        <thead><tr><th scope="col">Activity</th><th scope="col">Minutes</th><th scope="col">Points</th><th scope="col">Occurred</th></tr></thead>
        <tbody>{activities.map((activity, index) => <tr key={activity._id ?? `${activity.type}-${index}`}>
          <td>{activity.type}</td><td>{activity.minutes}</td><td>{activity.points}</td><td>{activity.occurredAt ? new Date(activity.occurredAt).toLocaleString() : '—'}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </div></section>;
}
