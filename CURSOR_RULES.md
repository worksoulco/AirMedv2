# Cursor Rules

## Documentation Maintenance Rules

### Before Each Action
1. Read and analyze:
   - CURSOR_CONTEXT.md for current implementation state
   - DEVELOPMENT_LOG.md for recent changes
   - DATABASE_SCHEMA.md for data structure context

2. Verify alignment:
   - Ensure planned actions align with documented state
   - Check for potential impacts on existing features
   - Review relevant database schemas if data changes involved

### During Implementation
Note: All Database changes will be manual - the SQL will be provided, and then I will create the connection in Supabase. 

If you have any questions - ASK!!! Don't make assumptions and break things.

1. Code Changes:
   - Document any schema modifications in DATABASE_SCHEMA.md
   - Update DEVELOPMENT_LOG.md with commands run
   - Note any errors or issues encountered
   - Record successful implementations

2. Database Operations:
   - Update DATABASE_SCHEMA.md for any structural changes
   - Document new tables, fields, or relationships
   - Record security policy modifications
   - Update RLS policy documentation

3. Frontend Development:
   - Document new components in CURSOR_CONTEXT.md
   - Update feature status and blockers
   - Record dependencies and relationships
   - Note any UI/UX considerations

### After Each Action
1. Update DEVELOPMENT_LOG.md:
   - Timestamp each entry
   - Document commands executed
   - Record errors and resolutions
   - List completed tasks
   - Update next steps

2. Update CURSOR_CONTEXT.md:
   - Modify implementation status
   - Update working features
   - Record new known issues
   - Revise current blockers
   - Update component status

3. Verify DATABASE_SCHEMA.md:
   - Ensure schema documentation is current
   - Update relationship diagrams if needed
   - Verify security policy documentation
   - Validate data type specifications

## File-Specific Guidelines

### DEVELOPMENT_LOG.md
- Use consistent timestamp format (YYYY-MM-DD HH:MM MST)
- Include all commands with parameters
- Document both successes and failures
- Maintain clear next steps section
- Reference related issues or blockers

### CURSOR_CONTEXT.md
- Keep implementation sections current
- Update feature status immediately
- Document all active components
- Maintain clear next steps
- Keep database state in sync
- Track all implementation progress

### DATABASE_SCHEMA.md
- Document all table structures
- Include field types and constraints
- Detail relationships between tables
- Document security policies
- Keep migration references updated

## Best Practices

1. Consistency:
   - Use standardized formatting
   - Follow established naming conventions
   - Maintain consistent documentation structure
   - Use clear and concise language

2. Completeness:
   - Document all significant changes
   - Include context for modifications
   - Reference related components
   - Note potential impacts

3. Clarity:
   - Use clear section headers
   - Include examples where helpful
   - Explain complex relationships
   - Document assumptions

4. Maintenance:
   - Regular documentation reviews
   - Remove outdated information
   - Update cross-references
   - Verify accuracy of all entries

## Implementation Workflow

1. Initial Assessment:
   - Review current documentation
   - Identify affected components
   - Plan necessary updates
   - Note potential risks

2. During Development:
   - Document changes as they occur
   - Update affected documentation
   - Note any deviations from plan
   - Record unexpected behavior

3. Completion:
   - Verify documentation updates
   - Cross-reference all changes
   - Update status in all files
   - Plan next steps

## Error Handling

1. When Errors Occur:
   - Document immediately in DEVELOPMENT_LOG.md
   - Update known issues in CURSOR_CONTEXT.md
   - Note any schema implications
   - Record resolution steps

2. Resolution:
   - Document fix implementation
   - Update affected documentation
   - Verify system stability
   - Note lessons learned

## Version Control Integration

1. Documentation Updates:
   - Align with code commits
   - Reference relevant changes
   - Maintain change history
   - Track migration versions

2. Schema Changes:
   - Document migration scripts
   - Note rollback procedures
   - Track dependency changes
   - Update affected components

## Follow up:
- After you complete the code, your output response should tell me exactly what whas changed, and also tell me what I need to do to implement the changes (like applying database migrations) 
