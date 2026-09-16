import sys

def main():
    schema_path = "prisma/schema.prisma"
    with open(schema_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    insert_str = """
  employeeShifts      Shift[]               @relation("EmployeeShifts")
  employeeTimesheets  Timesheet[]           @relation("EmployeeTimesheets")
  employeeReviews     PerformanceReview[]   @relation("EmployeeReviews")
"""
    
    idx = content.find("model Employee {")
    if idx == -1:
        print("Employee model not found")
        return
        
    end_idx = content.find("}", idx)
    
    new_content = content[:end_idx-1] + insert_str + content[end_idx-1:]
    
    with open(schema_path, "w", encoding="utf-8") as f:
        f.write(new_content)
        
    print("Schema updated successfully")

main()
