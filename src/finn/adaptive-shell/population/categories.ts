/**
 * Section 04 — Category system.
 *
 * Seeded with the mandated base set, extensible at runtime (registering a
 * new category is an explicit act, never a side effect of a typo — records
 * referencing an unregistered category fail validation).
 */
import { PopulationError } from "./types";

export const BASE_CATEGORIES = [
  "executive",
  "security",
  "compliance",
  "operations",
  "risk",
  "knowledge",
  "analytics",
  "workflow",
  "communication",
  "integration",
  "automation",
  "utilities",
] as const;

const CATEGORY_ID = /^[a-z][a-z0-9-]*$/;

export interface CategoryDefinition {
  readonly id: string;
  readonly description: string;
}

export class CategoryRegistry {
  private readonly categories = new Map<string, CategoryDefinition>();

  constructor() {
    for (const id of BASE_CATEGORIES) {
      this.categories.set(id, { id, description: `Base category: ${id}` });
    }
  }

  register(definition: CategoryDefinition): void {
    if (!CATEGORY_ID.test(definition.id)) {
      throw new PopulationError("categories", `invalid category id "${definition.id}"`);
    }
    if (this.categories.has(definition.id)) {
      throw new PopulationError("categories", `duplicate category "${definition.id}"`);
    }
    this.categories.set(definition.id, definition);
  }

  has(id: string): boolean {
    return this.categories.has(id);
  }

  list(): readonly CategoryDefinition[] {
    return [...this.categories.values()];
  }

  count(): number {
    return this.categories.size;
  }
}
