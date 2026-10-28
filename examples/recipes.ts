/**
 * Deterministic sample data for the table recipes (workload, invoice aging,
 * partner summary, status by month). In an app these rows come from your API.
 */
import { mulberry32 } from './data';

/** Readable text color in both color schemes (Mantine's filled shades are below AA for small text). */
export const tone = (color: 'green' | 'red' | 'blue' | 'orange' | 'gray') =>
  `light-dark(var(--mantine-color-${color}-9), var(--mantine-color-${color}-4))`;

const CLIENTS = ['Aster Labs', 'Bluefin Retail', 'Cobalt Health', 'Dune Logistics', 'Evergreen Foods', 'Falcon Energy', 'Granite Bank'];

/* ------------------------------------------------------------------ resource workload */

export interface WorkloadTask {
  id: string;
  serviceItem: string;
  task: string;
  dueDate: string;
  status: 'Done' | 'In progress' | 'Not started' | 'Overdue';
  hours: number;
}

export interface Engagement {
  id: string;
  client: string;
  name: string;
  start: string;
  end: string;
  tasks: WorkloadTask[];
}

export interface Resource {
  id: string;
  name: string;
  role: string;
  engagements: Engagement[];
  taskCount: number;
  overdue: number;
  plannedHours: number;
  capacity: number;
}

const PEOPLE = ['Anita Rao', 'Ben Carter', 'Chen Wei', 'Divya Menon', 'Elif Kaya', 'Farah Haddad', 'Gopal Iyer', 'Hana Sato'];
const RESOURCE_ROLES = ['Consultant', 'Senior consultant', 'Manager', 'Analyst'];
const SERVICE_ITEMS = ['Statutory audit', 'Tax advisory', 'Payroll', 'Bookkeeping'];
const TASKS = ['Collect documents', 'Review ledgers', 'Prepare draft', 'Client call', 'Final sign-off', 'File return'];
const STATUSES: WorkloadTask['status'][] = ['Done', 'In progress', 'Not started', 'Overdue'];

export function generateWorkload(seed = 7): Resource[] {
  const rand = mulberry32(seed);
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  return PEOPLE.map((name, p) => {
    const engagements: Engagement[] = Array.from({ length: 1 + Math.floor(rand() * 2) }, (_, e) => {
      const client = pick(CLIENTS);
      const month = 1 + Math.floor(rand() * 6);
      const tasks = Array.from({ length: 3 + Math.floor(rand() * 4) }, (_, t) => ({
        id: `r${p}-e${e}-t${t}`,
        serviceItem: pick(SERVICE_ITEMS),
        task: pick(TASKS),
        dueDate: `2026-${String(month + Math.floor(rand() * 3)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 27)).padStart(2, '0')}`,
        status: pick(STATUSES),
        hours: 2 + Math.floor(rand() * 14),
      }));
      return {
        id: `r${p}-e${e}`,
        client,
        name: `${client} – FY26 ${pick(SERVICE_ITEMS).toLowerCase()}`,
        start: `2026-${String(month).padStart(2, '0')}-01`,
        end: `2026-${String(month + 3).padStart(2, '0')}-30`,
        tasks,
      };
    });
    const tasks = engagements.flatMap((e) => e.tasks);
    return {
      id: `r${p}`,
      name,
      role: pick(RESOURCE_ROLES),
      engagements,
      taskCount: tasks.length,
      overdue: tasks.filter((t) => t.status === 'Overdue').length,
      plannedHours: tasks.reduce((n, t) => n + t.hours, 0),
      capacity: 40,
    };
  });
}

/* ------------------------------------------------------------------ invoice aging */

export const AGING_BUCKETS = ['Less than 15 days', '15 – 30 days', '31 – 60 days', 'Greater than 60 days'] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

export interface Invoice {
  id: string;
  number: string;
  customer: string;
  invoiceDate: string;
  dueDate: string;
  daysOverdue: number;
  bucket: AgingBucket;
  amount: number;
  outstanding: number;
}

export function bucketFor(days: number): AgingBucket {
  if (days < 15) return AGING_BUCKETS[0];
  if (days <= 30) return AGING_BUCKETS[1];
  if (days <= 60) return AGING_BUCKETS[2];
  return AGING_BUCKETS[3];
}

export function generateInvoices(count = 36, seed = 11): Invoice[] {
  const rand = mulberry32(seed);
  const today = Date.UTC(2026, 9, 28);
  const day = 86_400_000;
  return Array.from({ length: count }, (_, i) => {
    const daysOverdue = Math.floor(rand() * 95);
    const due = today - daysOverdue * day;
    const amount = Math.round((5_000 + rand() * 95_000) / 10) * 10;
    const paidShare = rand() < 0.3 ? Math.round(rand() * 6) / 10 : 0;
    return {
      id: `inv-${i + 1}`,
      number: `INV-2026-${String(1040 + i).padStart(4, '0')}`,
      customer: CLIENTS[Math.floor(rand() * CLIENTS.length)],
      invoiceDate: new Date(due - 30 * day).toISOString().slice(0, 10),
      dueDate: new Date(due).toISOString().slice(0, 10),
      daysOverdue,
      bucket: bucketFor(daysOverdue),
      amount,
      outstanding: Math.round(amount * (1 - paidShare)),
    };
  });
}

/* ------------------------------------------------------------------ partner financial summary */

export const CURRENCIES = ['USD', 'AED', 'SAR', 'INR'] as const;
export type Currency = (typeof CURRENCIES)[number];
/** Illustrative fixed rates to INR. */
export const INR_RATE: Record<Currency, number> = { USD: 83, AED: 22.6, SAR: 22.1, INR: 1 };

export interface PartnerNode {
  id: string;
  kind: 'partner' | 'customer' | 'proposal';
  name: string;
  year: number;
  customers?: number;
  proposals?: number;
  USD: number;
  AED: number;
  SAR: number;
  INR: number;
  /** Sum of all currencies converted to INR. */
  totalInr: number;
  children?: PartnerNode[];
}

const PARTNERS = ['Arjun Mehta', 'Bianca Rossi', 'Karim Saleh'];

function sumInto(parent: PartnerNode, children: PartnerNode[]) {
  for (const c of CURRENCIES) parent[c] = children.reduce((n, ch) => n + ch[c], 0);
  parent.totalInr = children.reduce((n, ch) => n + ch.totalInr, 0);
}

export function generatePartnerSummary(years: number[] = [2025, 2026], seed = 5): PartnerNode[] {
  const rand = mulberry32(seed);
  const out: PartnerNode[] = [];
  for (const year of years) {
    PARTNERS.forEach((partner, p) => {
      const customers: PartnerNode[] = Array.from({ length: 2 + Math.floor(rand() * 3) }, (_, c) => {
        const proposals: PartnerNode[] = Array.from({ length: 1 + Math.floor(rand() * 3) }, (_, q) => {
          const currency = CURRENCIES[Math.floor(rand() * CURRENCIES.length)];
          const value = Math.round((currency === 'INR' ? 200_000 + rand() * 4_000_000 : 2_000 + rand() * 60_000) / 100) * 100;
          const node: PartnerNode = {
            id: `${year}-p${p}-c${c}-q${q}`,
            kind: 'proposal',
            name: `P-${year}-${p}${c}${q}`,
            year,
            USD: 0,
            AED: 0,
            SAR: 0,
            INR: 0,
            totalInr: 0,
          };
          node[currency] = value;
          node.totalInr = value * INR_RATE[currency];
          return node;
        });
        const customer: PartnerNode = {
          id: `${year}-p${p}-c${c}`,
          kind: 'customer',
          name: CLIENTS[(p * 3 + c) % CLIENTS.length],
          year,
          proposals: proposals.length,
          USD: 0,
          AED: 0,
          SAR: 0,
          INR: 0,
          totalInr: 0,
          children: proposals,
        };
        sumInto(customer, proposals);
        return customer;
      });
      const node: PartnerNode = {
        id: `${year}-p${p}`,
        kind: 'partner',
        name: partner,
        year,
        customers: customers.length,
        proposals: customers.reduce((n, c) => n + (c.proposals ?? 0), 0),
        USD: 0,
        AED: 0,
        SAR: 0,
        INR: 0,
        totalInr: 0,
        children: customers,
      };
      sumInto(node, customers);
      out.push(node);
    });
  }
  return out;
}

/* ------------------------------------------------------------------ status by month */

export const PROPOSAL_STATUSES = ['win', 'lost', 'sent', 'draft', 'hold'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export type MonthStatusRow = { id: string; month: string } & Record<`${ProposalStatus}Count` | `${ProposalStatus}Amount`, number>;

const FY_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export function generateStatusByMonth(fyStart = 2026, seed = 3): MonthStatusRow[] {
  const rand = mulberry32(seed);
  return FY_MONTHS.map((m, i) => {
    const row = { id: `m${i}`, month: `${m} ${i < 9 ? fyStart : fyStart + 1}` } as MonthStatusRow;
    for (const s of PROPOSAL_STATUSES) {
      const count = Math.floor(rand() * (s === 'sent' ? 12 : 6));
      row[`${s}Count`] = count;
      row[`${s}Amount`] = count * Math.round((150_000 + rand() * 900_000) / 1000) * 1000;
    }
    return row;
  });
}

export const inr = (value: unknown) => (typeof value === 'number' ? value.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '');
