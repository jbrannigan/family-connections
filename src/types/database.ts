export type RelationshipType =
  | "biological_parent"
  | "adoptive_parent"
  | "step_parent"
  | "spouse"
  | "ex_spouse"
  | "partner";

export type MemberRole = "admin" | "member";

export interface Person {
  id: string;
  graph_id: string;
  display_name: string;
  pronouns: string | null;
  birth_date: string | null;
  death_date: string | null;
  birth_location: string | null;
  is_incomplete: boolean;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Relationship {
  id: string;
  graph_id: string;
  person_a: string;
  person_b: string;
  type: RelationshipType;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  created_at: string;
}

export interface Story {
  id: string;
  graph_id: string;
  person_id: string;
  content: string;
  is_fun_fact: boolean;
  author_id: string;
  created_at: string;
}

export interface FamilyGraph {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
}

export interface Membership {
  user_id: string;
  graph_id: string;
  role: MemberRole;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}
