-- BlueVolt Supabase RLS hardening.
-- Use after rotating leaked credentials and confirming the app uses server-side Prisma.
-- This blocks public Data API access to app tables while preserving server database access.

revoke all on schema public from anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    '_prisma_migrations',
    'Organization',
    'Store',
    'UserStoreRole',
    'Product',
    'Sales',
    'SaleItem',
    'User',
    'AuditLog',
    'Supplier',
    'PurchaseOrder',
    'Customer',
    'ContactInquiry',
    'StudioProject',
    'EmployeeUser',
    'EmployeeCrmRecord',
    'EmployeeCrmSheet',
    'EmployeeCrmSheetRow',
    'EmployeeAttendance',
    'EmployeeLeaveRequest',
    'EmployeeTask',
    'EmployeePayrollInput',
    'EmployeePerformanceReview',
    'EmployeeDocument',
    'EmployeeDepartment',
    'EmployeeNotification',
    'EmployeeExpenseClaim',
    'EmployeeAuditEvent',
    'EmployeeAnnouncement',
    'EmployeeComment',
    'EmployeeApplicant',
    'EmployeeMeeting',
    'EmployeeResource',
    'EmployeeRoleDefinition',
    'EmployeeChatMessage'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from anon, authenticated', table_name);
    end if;
  end loop;
end $$;

