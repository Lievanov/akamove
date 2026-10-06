// Stand-in for lib/supabase/admin.js. Records every
// apply_stripe_subscription call (the scenarios assert on them) and
// answers every table query with "nothing found, no error".
export const rpcCalls = [];

const emptyQuery = () => {
  const query = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "then") return (resolve) => resolve({ data: null, error: null });
        return () => query;
      },
    }
  );
  return query;
};

const fakeSupabaseAdmin = {
  rpc: async (name, args) => {
    rpcCalls.push({ name, args });
    return { data: { id: args.p_tenant_id, plan: args.p_plan }, error: null };
  },
  from: () => emptyQuery(),
};

export default fakeSupabaseAdmin;
