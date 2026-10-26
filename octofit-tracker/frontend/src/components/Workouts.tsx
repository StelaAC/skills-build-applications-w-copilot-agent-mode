import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = {
  _id?: string;
  title: string;
  focus: string;
  minutes?: number;
  difficulty?: string;
  reason?: string;
};

const userEmail = 'mona@example.com';

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: WorkoutSuggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
      .then((response) => {
        if (active) setSuggestions(response.suggestions);
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
    <h2 className="h4">Workout suggestions</h2>
    <p>Recommend workouts from activity patterns.</p>
    {loading ? <p role="status">Loading workout suggestions...</p> : error ? <p role="alert">Unable to load workout suggestions.</p> : suggestions.length === 0 ? <p role="status">No workout suggestions yet.</p> : <ul className="list-group list-group-flush">
      {suggestions.map((suggestion, index) => <li className="list-group-item" key={suggestion._id ?? `${suggestion.title}-${index}`}>
        <h3 className="h6">{suggestion.title}</h3>
        <p className="mb-1">{suggestion.focus}{suggestion.minutes ? ` - ${suggestion.minutes} min` : ''}{suggestion.difficulty ? ` - ${suggestion.difficulty}` : ''}</p>
        {suggestion.reason && <p className="mb-0">{suggestion.reason}</p>}
      </li>)}
    </ul>}
  </div></section>;
}
