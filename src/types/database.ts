export type RelationshipType =
  | "biological_parent"
  | "adoptive_parent"
  | "step_parent"
  | "spouse"
  | "ex_spouse"
  | "partner";

export type MemberRole = "owner" | "editor" | "contributor" | "viewer";

export interface Person {
  id: string;
  graph_id: string;
  display_name: string;
  given_name: string | null;
  nickname: string | null;
  preferred_name: string | null;
  avatar_url: string | null;
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

export interface StoryWithAuthor extends Story {
  author_name: string | null;
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

export interface InviteLink {
  id: string;
  graph_id: string;
  token: string;
  role: MemberRole;
  created_by: string;
  label: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/** Membership joined with profile info for member management UI. */
export interface MemberInfo {
  user_id: string;
  role: MemberRole;
  created_at: string;
  display_name: string | null;
}
