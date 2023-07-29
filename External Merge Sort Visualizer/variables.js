
// Max allowed number of relations per page (past this number relations get impossible to see)
const MAX_RECORDS_PER_PAGE = 50;
// Sorting algorithms
var algorithm_type = {
	two_way: 0,
	k_way: 1,
	replacement_selection: 2,
}
var algorithm_type_string_map = {
	0: "2-way External Sorting",
	1: "K-way External Sorting",
	2: "Replacement Selection External Sorting"
}

const LOG_DEBUG = false;

// Algorithm type
var selected_algorithm_type = null;

// Input values
var num_of_frames_in_buffer = -1;
var num_of_records_per_page = -1;
var num_of_records_of_file = -1;
var num_of_pages_of_file = -1;

var animation_velocities = {
	speed_3_00: 12,	// 3x
	speed_2_50: 10.5,
	speed_2_00: 9,	// 2x
	speed_1_75: 8,
	speed_1_50: 7,
	speed_1_25: 6,
	speed_1_00: 5,	// 1x
	speed_0_75: 4,
	speed_0_50: 3,
	speed_0_25: 2,
}
// Current animation speed
var selected_animation_speed_multiplier;

// ANIMATION
var pause_in_between_animation_phases;
var animation_is_playing = false;
var animate_forward_step = true;

// Other variables
var time = 0;
const ANIMATION_STEP_MULTIPLIER = 100; // NOTE: Don't change this, change animation_speed instead (this is also the minimum time in ms hte user needs to wait to move forwards / backwards with steps)

var STEP_DURATION;

// Other input variables ------------------------
var enable_fireworks = true;
var enable_focus_on_element = true;
var enable_algorithm_lines_highlighting = true;
var enable_custom_cursor = false;

function set_enable_fireworks(value) {
	enable_fireworks = value;
	if (!enable_fireworks) {
		// Stop fireworks
		stop_fireworks();
	} else {
		// Start fireworks if needed
		if (current_phase >= animation.length - 3) {
			start_fireworks();
		}
	}
}

function set_enable_focus_on_element(value) {
	enable_focus_on_element = value;
}

function set_enable_algorithm_lines_highlighting(value) {
	enable_algorithm_lines_highlighting = value;
	if (enable_algorithm_lines_highlighting) {
		// Set code lines to correct code lines
		if (current_phase >= 0 && current_phase < animation.length) {
			let phase_info = animation[current_phase + 1].phase_info;
			move_code_line_to(phase_info.code_line, phase_info.code_line_offset);
		}
	} else {
		// Hide code line
		move_code_line_to([-1]);
	}
}

function set_enable_custom_cursor(value) {

	enable_custom_cursor = value;

	if (value) {
		$("body").css("cursor", "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='34' height='34' viewBox='0 0 34 34'%3E%3Ctitle%3ESenza titolo-1%3C/title%3E%3Cg style='opacity:0.4'%3E%3Cpath d='M17.277.277a17,17,0,1,0,17,17A17,17,0,0,0,17.277.277Z' transform='translate(-0.277 -0.277)' style='fill:%23ed2024'/%3E%3C/g%3E%3Cpath d='M17.277,3.515A13.762,13.762,0,1,0,31.039,17.277,13.761,13.761,0,0,0,17.277,3.515Z' transform='translate(-0.277 -0.277)' style='fill:%23ed2024;opacity:0.4'/%3E%3Ccircle cx='17' cy='17' r='10.524' style='fill:%23ed2024;opacity:0.8'/%3E%3C/svg%3E\") 10 10, auto");
	} else {
		$("body").css("cursor", "");
	}
}
