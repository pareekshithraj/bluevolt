DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'AuditLog',
    'ContactInquiry',
    'Customer',
    'EmployeeAnnouncement',
    'EmployeeApplicant',
    'EmployeeAttendance',
    'EmployeeAuditEvent',
    'EmployeeChatMessage',
    'EmployeeComment',
    'EmployeeCrmRecord',
    'EmployeeCrmSheet',
    'EmployeeCrmSheetRow',
    'EmployeeDepartment',
    'EmployeeDocument',
    'EmployeeExpenseClaim',
    'EmployeeLeaveRequest',
    'EmployeeMeeting',
    'EmployeeNotification',
    'EmployeePayrollInput',
    'EmployeePerformanceReview',
    'EmployeeResource',
    'EmployeeRoleDefinition',
    'EmployeeTask',
    'EmployeeUser',
    'Organization',
    'Product',
    'PurchaseOrder',
    'SaleItem',
    'Sales',
    'Store',
    'StudioProject',
    'Supplier',
    'User',
    'UserStoreRole',
    '_prisma_migrations'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "deny_direct_api_access" ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY "deny_direct_api_access" ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      table_name
    );
  END LOOP;
END $$;
