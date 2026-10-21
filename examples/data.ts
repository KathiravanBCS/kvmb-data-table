export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  salary: number;
  startDate: string;
  active: boolean;
  skills: string[];
  location: { city: string; country: string };
}

export const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Finance', 'Support', 'Operations'];
const ROLES = ['Associate', 'Specialist', 'Senior', 'Lead', 'Manager', 'Director'];
const FIRST = ['Ada', 'Alan', 'Grace', 'Linus', 'Margaret', 'Ken', 'Barbara', 'Dennis', 'Frances', 'Edsger', 'Radia', 'Tim', 'Hedy', 'John', 'Katherine', 'Guido'];
const LAST = ['Lovelace', 'Turing', 'Hopper', 'Torvalds', 'Hamilton', 'Thompson', 'Liskov', 'Ritchie', 'Allen', 'Dijkstra', 'Perlman', 'Berners-Lee', 'Lamarr', 'Backus', 'Johnson', 'van Rossum'];
const CITIES: [string, string][] = [['Berlin', 'Germany'], ['London', 'UK'], ['New York', 'USA'], ['Chennai', 'India'], ['Tokyo', 'Japan'], ['São Paulo', 'Brazil'], ['Toronto', 'Canada']];
export const SKILLS = ['React', 'TypeScript', 'SQL', 'Go', 'Design', 'Negotiation', 'Excel', 'Python'];

/** Deterministic pseudo-random generator so demos and tests are reproducible. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateEmployees(count: number, seed = 42): Employee[] {
  const rand = mulberry32(seed);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const rows: Employee[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const first = pick(FIRST);
    const last = pick(LAST);
    const [city, country] = pick(CITIES);
    const start = new Date(Date.UTC(2012 + Math.floor(rand() * 13), Math.floor(rand() * 12), 1 + Math.floor(rand() * 28)));
    rows[i] = {
      id: String(i + 1),
      name: `${first} ${last}`,
      email: `${first}.${last}${i}@example.com`.toLowerCase().replace(/\s/g, ''),
      department: pick(DEPARTMENTS),
      role: pick(ROLES),
      salary: Math.round(40_000 + rand() * 160_000),
      startDate: start.toISOString().slice(0, 10),
      active: rand() > 0.2,
      skills: SKILLS.filter(() => rand() > 0.7),
      location: { city, country },
    };
  }
  return rows;
}

export const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
