export type PortalUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
  role?: string | null;
  accountStatus?: string | null;
  employerName?: string | null;
  jobTitle?: string | null;
  segment?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  interestAreas?: string[] | null;
  groupOrganizations?: string[] | null;
  lgpdAccepted?: boolean | null;
  lgpdAcceptedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PortalOrganization = {
  id: string;
  name: string;
  slug: string;
};

export type AuthSuccess<T> = { ok: true; data: T };
export type AuthFailure = { ok: false; error: string; status: number };

export type LoginResult = AuthSuccess<{ user: PortalUser; token: string }> | AuthFailure;

export type RegisterBody = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  lgpdAccepted: boolean;
};

export type UpdateProfileBody = Partial<
  Pick<
    PortalUser,
    | 'firstName'
    | 'lastName'
    | 'phone'
    | 'whatsapp'
    | 'cpf'
    | 'employerName'
    | 'jobTitle'
    | 'segment'
    | 'country'
    | 'state'
    | 'city'
    | 'interestAreas'
    | 'groupOrganizations'
  >
>;

export type ChangePasswordBody = {
  password: string;
};
