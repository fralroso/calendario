import Dexie, { type Table } from 'dexie';
import type { Activity } from '../domain/activity';
import type { Task } from '../domain/task';

// Base de datos local (IndexedDB). Vive en el celular y funciona sin internet.
class CalendarioDB extends Dexie {
  activities!: Table<Activity, string>;
  tasks!: Table<Task, string>;

  constructor() {
    super('calendario');
    this.version(1).stores({
      activities: 'id, date, syncState, updatedAt',
    });
    this.version(2).stores({
      activities: 'id, date, syncState, updatedAt',
      tasks: 'id, dueDate, syncState, updatedAt',
    });
  }
}

export const db = new CalendarioDB();
