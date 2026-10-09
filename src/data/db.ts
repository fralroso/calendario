import Dexie, { type Table } from 'dexie';
import type { Activity } from '../domain/activity';

// Base de datos local (IndexedDB). Vive en el celular y funciona sin internet.
class CalendarioDB extends Dexie {
  activities!: Table<Activity, string>;

  constructor() {
    super('calendario');
    this.version(1).stores({
      activities: 'id, date, syncState, updatedAt',
    });
  }
}

export const db = new CalendarioDB();
