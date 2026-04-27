// Utility function to create page URLs based on page names

export function createPageUrl(pageName) {
  switch (pageName.toLowerCase()) {
    case "dashboard":
      return "/dashboard";
    case "timetable":
      return "/timetable";
    case "courses":
      return "/courses";
    case "teachers":
      return "/teachers";
    case "students":
      return "/students";
    case "sections":
      return "/sections";
    case "rooms":
      return "/rooms";
    case "timeslots":
      return "/timeslots";
    case "View Timetable":
      return "/timetable";
    case "Add Course":
      return "/courses";
    case "Add Teacher":
      return "/teachers";
    default:
      return "/";
  }
}
