import csv
import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta

def parse_csv(file_path):
    teachers = []
    with open(file_path, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            teacher = {
                'name': row['teacher_name'],
                'preferred_days': row['preferred_days'].split(','),
                'preferred_times': row['preferred_times'].split(','),
                'courses': row['courses'].split(',')
            }
            teachers.append(teacher)
    return teachers

def generate_time_slots(start_time, end_time, slot_duration, lunch_start, lunch_duration):
    slots = []
    current_time = start_time

    while current_time + slot_duration <= end_time:
        # Skip lunch break
        if lunch_start <= current_time < (lunch_start + lunch_duration):
            current_time += lunch_duration
            continue

        slot_name = current_time.strftime('%H:%M') + ' - ' + (current_time + slot_duration).strftime('%H:%M')
        slots.append(slot_name)
        current_time += slot_duration

    return slots

def initialize_schedule(days, slots):
    return {day: {slot: defaultdict(list) for slot in slots} for day in days}

def get_available_rooms(course_type):
    room_types = {
        'Theory': ['Theory Room 101', 'Theory Room 102', 'Theory Room 103'],
        'Computer Lab': ['Computer Lab 202', 'Computer Lab 203', 'Computer Lab 302'],
        'Circuit Lab': ['Circuit Lab 157']
    }
    return room_types.get(course_type, [])

def allocate_courses(teachers, schedule):
    valid_days = set(schedule.keys())
    theory_count = defaultdict(int)
    room_occupancy = {day: {slot: set() for slot in schedule[day].keys()} for day in valid_days}

    for teacher in teachers:
        teacher_schedule = {day: {slot: False for slot in schedule[day].keys()} for day in valid_days}

        for course in teacher['courses']:
            course_name, course_details = course.split('[')
            course_type, course_year = course_name.split('(')[1].strip(')'), course_details.strip(']')
            available_rooms = get_available_rooms(course_type)

            for day in teacher['preferred_days']:
                if day not in valid_days:
                    continue

                for slot in teacher['preferred_times']:
                    if teacher_schedule[day][slot]:
                        continue

                    rooms_in_use = room_occupancy[day][slot]
                    available_for_this_slot = [room for room in available_rooms if room not in rooms_in_use]

                    if not available_for_this_slot:
                        continue

                    room = available_for_this_slot[0]

                    if course_type in ['Computer Lab', 'Circuit Lab']:
                        next_slot_index = list(schedule[day].keys()).index(slot) + 1
                        if next_slot_index < len(schedule[day]):
                            next_slot = list(schedule[day].keys())[next_slot_index]

                            if len(schedule[day][next_slot][course_year]) == 0:
                                schedule[day][slot][course_year].append({
                                    'teacher': teacher['name'],
                                    'course': course_name.strip(),
                                    'year': course_year,
                                    'room': room,
                                    'time': f"{slot} + {next_slot}"
                                })
                                schedule[day][next_slot][course_year].append({
                                    'teacher': teacher['name'],
                                    'course': course_name.strip(),
                                    'year': course_year,
                                    'room': room
                                })
                                room_occupancy[day][slot].add(room)
                                room_occupancy[day][next_slot].add(room)
                                teacher_schedule[day][slot] = True
                                teacher_schedule[day][next_slot] = True
                                break
                    else:
                        if len(schedule[day][slot][course_year]) == 0:
                            schedule[day][slot][course_year].append({
                                'teacher': teacher['name'],
                                'course': course_name.strip(),
                                'year': course_year,
                                'room': room
                            })
                            room_occupancy[day][slot].add(room)
                            teacher_schedule[day][slot] = True
                            break

def main(file_path, num_slots, start_time_str, end_time_str, slot_duration_min, lunch_start_str, lunch_duration_min):
    # Parse inputs
    start_time = datetime.strptime(start_time_str, '%H:%M')
    end_time = datetime.strptime(end_time_str, '%H:%M')
    slot_duration = timedelta(minutes=slot_duration_min)
    lunch_start = datetime.strptime(lunch_start_str, '%H:%M')
    lunch_duration = timedelta(minutes=lunch_duration_min)

    # Generate time slots
    slots = generate_time_slots(start_time, end_time, slot_duration, lunch_start, lunch_duration)

    # Initialize schedule
    days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
    schedule = initialize_schedule(days, slots)

    # Parse teacher data and allocate courses
    teachers = parse_csv(file_path)
    allocate_courses(teachers, schedule)

    # Output schedule as JSON
    print(json.dumps(schedule, indent=4))

if __name__ == "__main__":
    if len(sys.argv) != 8:
        print("Usage: python schedule_generator.py <csv_file> <num_slots> <start_time> <end_time> <slot_duration> <lunch_start> <lunch_duration>")
        sys.exit(1)

    csv_file_path = sys.argv[1]
    num_slots = int(sys.argv[2])
    start_time = sys.argv[3]
    end_time = sys.argv[4]
    slot_duration = int(sys.argv[5])
    lunch_start = sys.argv[6]
    lunch_duration = int(sys.argv[7])

    main(csv_file_path, num_slots, start_time, end_time, slot_duration, lunch_start, lunch_duration)
