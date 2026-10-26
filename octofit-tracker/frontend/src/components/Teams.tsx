import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = {
  _id?: string;
  name: string;
  mascot?: string;
  members?: string[];
};

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then((response) => {
        if (active) setTeams(response.teams);
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
    <h2 className="h4">Teams</h2>
    <p>Manage teams and members.</p>
    {loading ? <p role="status">Loading teams...</p> : error ? <p role="alert">Unable to load teams.</p> : teams.length === 0 ? <p role="status">No teams yet.</p> : <ul className="list-group list-group-flush">
      {teams.map((team, index) => <li className="list-group-item" key={team._id ?? `${team.name}-${index}`}>
        <h3 className="h6">{team.name}</h3>
        {team.mascot && <p className="mb-1">Mascot: {team.mascot}</p>}
        <p className="mb-0">Members: {team.members?.join(', ') || 'None'}</p>
      </li>)}
    </ul>}
  </div></section>;
}
