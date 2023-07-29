
function set_input_values(refresh_visualization, _num_of_pages_of_file = -1, _num_of_frames_in_buffer = -1, _num_of_records_of_file = -1, _num_of_records_per_page = -1) {
	if (_num_of_frames_in_buffer != -1) num_of_frames_in_buffer = _num_of_frames_in_buffer;
	if (_num_of_records_per_page != -1) num_of_records_per_page = _num_of_records_per_page;
	if (_num_of_records_of_file != -1) num_of_records_of_file = _num_of_records_of_file;
	if (_num_of_pages_of_file != -1) num_of_pages_of_file = _num_of_pages_of_file;
	if (refresh_visualization) initialize_visuals_and_animation(true, false, false);
}

/**
 * @description Sets the selected animation speed to the specified speed 
 * NOTE: this does NOT modify the actual speed, use the "update_actual_speed" function after setting the selected speed to do so
 */
function set_selected_speed(speed) {
	selected_animation_speed_multiplier = get_animation_speed_multiplier(speed);	// The higher, the slowest
	if (LOG_DEBUG) console.log('Selected animation speed: ' + speed);
}
function get_animation_speed_multiplier(speed) {
	return 10 / animation_velocities[speed];
}
/**
 * @description Sets the ACTUAL animation speed to the speed (previously) selected using the "set_speed" function
 */
function update_actual_speed() {

	pause_in_between_animation_phases = 335 * selected_animation_speed_multiplier - 275;	// in ms
	STEP_DURATION = ANIMATION_STEP_MULTIPLIER * selected_animation_speed_multiplier;

	should_update_speed = false;

	if (LOG_DEBUG) {
		console.log('Selected animation speed multiplier: ' + selected_animation_speed_multiplier + "\n" +
			'Pause in between animation phases: ' + pause_in_between_animation_phases + "\n" +
			'Step duration: ' + STEP_DURATION);
	}
}

var focused_element_to_follow_with_view = undefined;
var focus_element = true;

var current_phase = -1;

function fast_forward_to_phase(phase) {

	let fast_forward_to_phase_index = phase;

	let temp_animate = animate_forward_step;
	let temp_duration = STEP_DURATION;
	let temp_pause = pause_in_between_animation_phases;

	animate_forward_step = false;
	STEP_DURATION = 1;
	pause_in_between_animation_phases = 10;

	while (current_phase < fast_forward_to_phase_index && current_phase < animation.length - 1) {
		increase_time(true);
	}

	animate_forward_step = temp_animate;
	STEP_DURATION = temp_duration;
	pause_in_between_animation_phases = temp_pause;
}

// stores values of records in their original order and in the order they are initialized (visualized in file)
var original_records_values_order = [
	// {
	//	value: ?,
	//	index: 0,
	//},
];

var phase_of_animation_completion_timer = -1;

var step_animation_timer_for_buttons_hold = 0;

var holding_keys = {
	"one_down": false,
	"ArrowRight": false,
	"ArrowLeft": false
}

var time_to_hold_next_phase_button_before_stepping_automatically = 300;
var play_animation_until_next_phase = false;
var decrease_until_previous_phase = false;

var should_update_speed = false;

function get_record_height(ignore_border_thickness = false) {
	let height_of_block = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-dim'));
	// NOTE: border width changes on page zoom on browsers, therefore we can't use its initial px value,
	// but rather have to find the "#frame-buffer .block" and get its border (since its the only element whose borders are always avaliable)
	let border_thickness = get_actual_border_width();
	// let additional_border_thickness = border_thickness * 2;
	let actual_height_of_block = height_of_block + border_thickness;
	let records_height = (actual_height_of_block / num_of_records_per_page) - border_thickness;
	if (ignore_border_thickness) {
		records_height += border_thickness;
	}
	return records_height;
}

function get_actual_border_width() {
	let border_thickness = getComputedStyle((document.getElementById("frame-buffer"))).borderTopWidth.slice(0, -2);
	return parseFloat(border_thickness);
}

var last_set_num_of_pages_of_file = 0;
var last_set_num_of_records_of_file = 0;
var last_set_num_of_records_per_page = 0;

function initialize_visualization(num_of_pages_of_file, num_of_frames, num_of_records_of_file, num_of_records_per_page, force_records_refresh = false) {

	if (LOG_DEBUG) console.log("Initializing visualization with " + num_of_pages_of_file + " pages, " + num_of_frames + " frames, " + num_of_records_of_file + " records, " + num_of_records_per_page + " records per page.")

	reset_displayed_phase_pass_and_io_ops();

	let refresh_records =
		last_set_num_of_pages_of_file != num_of_pages_of_file ||
		last_set_num_of_records_of_file != num_of_records_of_file ||
		last_set_num_of_records_per_page != num_of_records_per_page;

	last_set_num_of_pages_of_file = num_of_pages_of_file;
	last_set_num_of_records_of_file = num_of_records_of_file;
	last_set_num_of_records_per_page = num_of_records_per_page;

	// Empty the buffer
	$('#frame-buffer .blocks-container').empty();

	let page_html = '<div class="block"><div class="block-name"></div></div>';

	if (refresh_records || force_records_refresh) {

		// Empty the file
		$('#file .blocks-container').empty();

		// create pages of file
		let record_html = '<div class="record"></div>';
		let attached_records = 1;

		let records_height = get_record_height();
		let border_width = get_actual_border_width();

		for (let i = 0; i < num_of_pages_of_file; i++) {

			$('#file .blocks-container').first().append(page_html);

			// to each page, attach records until all records are attached
			// if we go past the max number of records per page, skip to the next page creation
			for (let j = 0; j < num_of_records_per_page; j++) {
				if (attached_records > num_of_records_of_file) {
					break;
				}

				// add a record to the page
				$('#file .block').last().append(record_html);

				// Set margin of records to the correct border width value (note that this value changes with brpwsers and zoom levels, may be rounded, ecc...)
				$('#file .record').last().css('margin-top', "-" + border_width + 'px');
				$('#file .record').last().css('margin-left', "-" + border_width + 'px');

				// set the height of the record
				$('#file .record').last().css('height', records_height + 'px');
				$('#file .record').last().css('line-height', records_height + 'px');
				if (num_of_records_per_page <= 6) {
					// from 1 to 6 records per page (show text inside the record)
					let font_size = records_height;
					if (font_size > 24) font_size = 24;
					$('#file .record').last().css('font-size', font_size * 0.9 + 'px');

					if (num_of_records_per_page == 1) {
						$('#file .record').last().css('text-align', 'center');
						$('#file .record').last().css('padding-left', 2.5 + 'px');
						$('#file .record').last().css('padding-right', 2.5 + 'px');
					}
				} else {

					// From 7 to 10 records per page (show text outside the record, to its right)
					// If the number of records is 11 or more, the text will be hidden (see below, in "assign_values_to_file_records()" function)
					$('#file .record').last().addClass('alternate-text');
					$('#file .record').last().css('font-size', Math.max(records_height, 8) * 1.25 + 'px');

					// 31 or more records (hides the border, i.e. makes its color transparent)
					if (num_of_records_per_page > 30) {
						$('#file .record').last().css('border-color', 'transparent');
					}
				}
				attached_records++;
			}
		}

		// assigns values (and colors) to records
		assign_values_to_file_records(num_of_records_per_page, num_of_records_of_file);
	}

	// create frames
	let frame_hmtl = page_html;
	for (let i = 0; i < num_of_frames; i++) {
		$('#frame-buffer .blocks-container').first().append(frame_hmtl);
	}

}

// Assigns values to records of file (along with colors)
function assign_values_to_file_records(num_of_records_per_page, num_of_records_of_file) {
	let values = [];
	for (let i = 1; i <= num_of_records_of_file; i++) values.push(i);
	values = values.sort(() => Math.random() - 0.5);
	refresh_file_record_values(values, num_of_records_per_page);
}

function refresh_file_record_values(values) {

	original_records_values_order = [];

	$('#file .record').each(function (index, record) {

		let value = values[index];

		original_records_values_order.push({
			'index': index,
			'value': value,
		});


		$(record).attr('value', value);

		if (num_of_records_per_page <= 6) {
			$(record).html((value).toString());
		} else if (num_of_records_per_page <= 10) {
			// add the value to the record in its pseudo element ":after"
			$(record).append('<div class="record-value">' + value + '</div>');
		} else {
			// Do not append the value text to the record if it has 11 or more records 
			// NOTE: the "value" attribute of the record is still set to be used by the algorithm
			$(record).append('<div class="record-value hidden-value">' + value + '</div>');
		}

		// compute the color
		let color = calculate_record_color_css_from_value(value);
		$(record).css('background-color', color);

	});

	// Records are sorted in the actual final visualized order (i.e. by their value)
	original_records_values_order.sort((a, b) => (a.value > b.value) ? 1 : -1);
}

function calculate_record_color_css_from_value(value) {
	let max_hue = 345;
	let start_hue = -11;

	let hue_value = Math.floor((value - 1) * max_hue / num_of_records_of_file + start_hue);
	let color_string = '';
	color_string = 'hsl(' + hue_value + ', 90%, 57%)';

	return color_string;
}

var input_output_operations_counter = 0;
var previous_set_pass = -3;

function display_phase_description_and_code_line(phase_info, display_for_forward_step) {

	if (phase_info === undefined) return false;

	// Move the code line to highlight the correct code line
	move_code_line_to(phase_info.code_line, phase_info.code_line_offset);

	let description_to_display = phase_info.description();						// Show phase description
	// description_to_display = current_phase + ") " + description_to_display;		// Uncomment to show description along with with the phase number, as "1) ..."

	if (!description_to_display) return false;

	let currently_displayed_description = $.trim($(".current-phase-description span").html());
	if (selected_animation_speed_multiplier < get_animation_speed_multiplier("speed_1_50") && animation_is_playing && current_phase < animation.length - 3) {
		description_to_display = "<span class=\"text-info-note\">INFO</span> Set the animation speed to 1.5x or lower or use the <b>left/arrow keys</b> or <b>backwards/forward buttons</b> to see a <b>step-by-step description</b> of the algorithm.";
	}

	// Replace the &ThinSpace; html entity with a normal space, and replace the displayed description actual thin space with a regular space, again
	let parsed_description_to_display = description_to_display.replaceAll("&ThinSpace;", " ");
	// Note: find the actually already changed character in the string and replace it with a normal space
	// Dont use the actual character, use its unicode code
	let parsed_currently_displayed_description = currently_displayed_description.replaceAll("\u2009", " ");

	if (description_to_display != "" && parsed_currently_displayed_description != parsed_description_to_display) {

		// NOTE: jquery cant animate transform, hence I am using the "transition" property in the actual style of the element
		$(".current-phase-description").css("transform", "scale(0.8)");

		let animation_time = Math.min(100, STEP_DURATION / 2);

		let movement_multiplier = display_for_forward_step ? -1 : 1;
		$(".current-phase-description > div").animate({
			top: (movement_multiplier * 60).toString() + "px",
			opacity: " 0",
		}, animation_time, "linear", function () {
			$(".current-phase-description span").html(description_to_display);

			$(".current-phase-description > div").css("top", (-1 * movement_multiplier * 60).toString() + "px");
			$(".current-phase-description > div").css("opacity", "0");

			// NOTE: jquery cant animate transform, hence I am using the "transition" property in the actual style of the element
			$(".current-phase-description").css("transform", "scale(1)");

			$(".current-phase-description > div").animate({
				top: "0px",
				opacity: "1",
			}, animation_time, "linear");
		});
	}

}

function display_phase_pass_and_io_ops(pass, phase_io_operations, display_for_forward_step) {

	// Display current pass
	let current_pass_html = "<span>Current pass:</span><span><b>i=" + pass + "</b></span>"
	if (pass == -2) current_pass_html = "<span>Algorithm is over</span>"	//  End of algorithm
	if (pass == -1) current_pass_html = "<span>Algorithm is starting...</span>"	// Start of algorithm
	let current_pass_elem = $("#current-pass");
	if (previous_set_pass != pass) {
		// Animate the current pass
		current_pass_elem.css("transition", "");
		current_pass_elem.css("color", "yellow");
		setTimeout(() => {
			current_pass_elem.css("transition", "250ms");
			current_pass_elem.css("color", "#d3d3d3");
		}, 100);
	}
	previous_set_pass = pass;
	current_pass_elem.html(current_pass_html);

	// Increase (or decrease) I/O operations counter
	if (current_phase <= 0) input_output_operations_counter = 0;
	let io_ops_elem = $("#io-operations");
	if (display_for_forward_step) input_output_operations_counter += phase_io_operations;
	else input_output_operations_counter -= phase_io_operations;
	let io_ops_html = "<span>I/O Operations:</span><span><b>" + input_output_operations_counter + "</b></span>"
	if (phase_io_operations > 0) {
		// Animate the I/O operations counter
		io_ops_elem.css("transition", "");
		io_ops_elem.css("color", "yellow");
		setTimeout(() => {
			io_ops_elem.css("transition", "250ms");
			io_ops_elem.css("color", "#d3d3d3");
		}, 100);
	}
	io_ops_elem.html(io_ops_html);

}

function reset_displayed_phase_pass_and_io_ops() {
	// Reset current pass
	let current_pass_html = "<span style='letter-spacing: -0.035vw; color: white;'>Press <span class='play-pause-icon button-icon' style='display: inline-block; margin-top: -1vw; transform: translateY(0.27vw)'></span> or <span class='step-forward-icon button-icon' style='margin-top: -0.1vw; transform: translateY(0.14vw)'></span> to start</span>" // Start of algorithm
	let current_pass_elem = $("#current-pass");
	current_pass_elem.html(current_pass_html);

	// Reset I/O operations counter
	let io_ops_elem = $("#io-operations");
	let io_ops_html = "<span style='letter-spacing: -0.035vw; color: white;'>Press <span class='sorting-tree-icon button-icon' style='display: inline-block; margin-top: -1vw; transform: translateY(0.27vw)'></span>  for the sorting tree</span></span>"
	io_ops_elem.html(io_ops_html);

}

var last_recorded_time = 0;

function get_animation_phase_based_on_time(time) {
	let difference = time - last_recorded_time;
	let phase = current_phase;
	if (animation[current_phase] === undefined) return 0;
	if (difference > animation[current_phase].duration()) {
		return phase + 1;
	} else if (difference < 0 && Math.abs(difference) > animation[current_phase].duration()) {
		return phase - 1;
	}
	return phase;
}

function increase_time(play_phase_animation = true) {
	// if (phase_of_animation_completion_timer.length == 0) return;
	if (current_phase <= animation.length) time += ANIMATION_STEP_MULTIPLIER;
	if (get_animation_phase_based_on_time(time) > current_phase) {

		if (should_update_speed) update_actual_speed();

		current_phase++;
		last_recorded_time = time;

		if (play_animation_until_next_phase) play_animation_until_next_phase = false;

		if (current_phase >= 0 && current_phase < animation.length && animation[current_phase] !== undefined) {
			if (play_phase_animation) {
				animation[current_phase].play(animate_forward_step);
				set_phase_of_animation_completion_timer(animation[current_phase].duration());

				if (current_phase + 1 < animation.length) display_phase_description_and_code_line(animation[current_phase + 1].phase_info, true);
				if (current_phase + 1 < animation.length) display_phase_pass_and_io_ops(animation[current_phase].phase_info.pass_number, animation[current_phase].phase_info.io_operations, true);
				if (LOG_DEBUG) console.log('========== Animation phase (increased): ' + current_phase + '.\n' + animation[current_phase].phase_info.description() + "\nPass of phase: " + animation[current_phase].phase_info.pass_number);
			}
		}
	}
}

function decrease_time(set_state_animation = true) {

	time -= ANIMATION_STEP_MULTIPLIER;

	if (get_animation_phase_based_on_time(time) < current_phase) {

		if (should_update_speed) update_actual_speed();

		current_phase--;
		last_recorded_time = time;

		if (decrease_until_previous_phase) decrease_until_previous_phase = false;

		if (current_phase >= 0) {
			if (set_state_animation) {

				disable_scroll_temporarily = true;

				animation[current_phase].rollback(false);

				setTimeout(() => {
					disable_scroll_temporarily = false;
				}, STEP_DURATION);

				if (current_phase + 1 < animation.length) display_phase_description_and_code_line(animation[current_phase + 1].phase_info, false);
				if (current_phase + 1 < animation.length) display_phase_pass_and_io_ops(animation[current_phase].phase_info.pass_number, animation[current_phase + 1].phase_info.io_operations, false);
				if (LOG_DEBUG) {
					let append_string = "\n UNDOING: " + animation[current_phase + 1].phase_info.description();
					console.log('========== Animation phase (decreased): ' + current_phase + "." + append_string + "\nPass of phase: " + animation[current_phase].phase_info.pass_number);
				}
			}
		}
	}
}

// Timer used to check if a phase of an animation is actually playing
function set_phase_of_animation_completion_timer(time) {
	phase_of_animation_completion_timer = time;
}
function one_phase_of_animation_is_playing() {
	return phase_of_animation_completion_timer > 0;
}
function start_updating_phase_of_animation_completion_timer() {
	// Decrease the timer every animation step divided by 10, this should go on automatically
	setInterval(() => {
		if (phase_of_animation_completion_timer >= 0) {
			phase_of_animation_completion_timer -= ANIMATION_STEP_MULTIPLIER / 10;
		}
	}, ANIMATION_STEP_MULTIPLIER / 10);
}


var pressed_step_forward_button = false;
var pressed_step_backwards_button = false;

function timeline() {
	if (animation_is_playing) {
		// animation is playing
		increase_time();
	} else {
		// animation NOT playing

		// decrease step animation timer
		if (step_animation_timer_for_buttons_hold > 0) {
			step_animation_timer_for_buttons_hold -= ANIMATION_STEP_MULTIPLIER;
		}

		// keys holding
		if ((holding_keys["ArrowRight"] || pressed_step_forward_button) || play_animation_until_next_phase) {
			// right arrow (time increases)

			if (current_phase == -1) {
				pressed_step_forward_button = false;
				key_controls_handler(undefined, false);
			}

			if (step_animation_timer_for_buttons_hold <= 0.01 || play_animation_until_next_phase) {

				let just_pressed_the_button = play_animation_until_next_phase;

				if (current_phase == animation.length - 1) {
					// This is the very last phase
					play_animation_until_next_phase = false;
					pressed_step_forward_button = false;
					key_controls_handler(undefined, false);
				}

				// increase the time until the phase changes
				if (play_animation_until_next_phase && (one_phase_of_animation_is_playing() || current_phase == -1)) {
					if (LOG_DEBUG) console.log("Pressed the right arrow while a phase of the animation is playing: starting increasing time until we can play the next phase animation...")
					// One phase of the animation is playing, so we need to wait for it to finish (we update its time)
					increase_time();
				} else if (current_phase < animation.length - 1) {
					if (LOG_DEBUG) console.log("Holding (or pressed) the right arrow: increasing time until the next phase...")
					let phase = get_animation_phase_based_on_time(time);
					while (get_animation_phase_based_on_time(time) == phase && current_phase < animation.length) {
						increase_time();
					}
				}

				// Set the timer to play the next phase's animation if the user is still holding down the button
				if (just_pressed_the_button) {
					// User just started holding the button (the animation played until the next phase, now we set a timeout at the end of which,
					//  	if the user is still holding the button, the animation will continue)
					let animation_duration = 0;
					if (animation[current_phase] !== undefined) animation_duration = animation[current_phase].duration();
					start_step_animation_timer(Math.max(time_to_hold_next_phase_button_before_stepping_automatically, animation_duration));
				} else {
					// set the timer to the duration of the current phase (minus pause in between timer)
					if (animation[current_phase] !== undefined) start_step_animation_timer(animation[current_phase].duration() - pause_in_between_animation_phases);
				}
			}
		} else if (holding_keys["ArrowLeft"] || pressed_step_backwards_button || decrease_until_previous_phase) {

			if (selected_algorithm_type == algorithm_type.replacement_selection && animation[current_phase] !== undefined && animation[current_phase].phase_info.pass_number == 0) {
				// If the current phase is the first pass of the replacement selection algorithm, do not allow to go backwards
				if (LOG_DEBUG) console.log("Cannot go backwards from the first pass of the replacement selection algorithm");

				pressed_step_backwards_button = false;
				decrease_until_previous_phase = false;
				key_controls_handler(undefined, false);

				let confirm = window.confirm("The visualization of the Replacement Selection External Sorting algorithm doesn't allow to get back of a single step during pass 0.\n\n" +
					"This is because the behaviour of this algorithm highly depends on the specific records of the file being sorted.\n\n" +
					"You can still get back to the start of pass 0 for this visualization and replay the animation from there.\n" +
					"Do you want to go back to the start of pass 0?");
				if (confirm) {
					// Restart pass 0
					if (LOG_DEBUG) console.log("Restarting pass 0...");
					// current_phase = 0;
					restart(false);
					initialize_animation();
					fast_forward_to_phase(1);
				} else {
					return;
				}
			} else {

				if (step_animation_timer_for_buttons_hold <= 0.01 || decrease_until_previous_phase) {

					let just_pressed_the_button = decrease_until_previous_phase;

					if (current_phase == 0) {
						// This is the very first phase (phase 0)
						decrease_until_previous_phase = false;
						pressed_step_backwards_button = false;
						key_controls_handler(undefined, false);
					}

					// decrease the time until the phase changes
					if (decrease_until_previous_phase && (one_phase_of_animation_is_playing() || current_phase == -1)) {
						if (LOG_DEBUG) console.log("Pressed the left arrow while a phase of the animation is playing: starting decreasing time until we can play the next phase animation...");
						// One phase of the animation is playing, so we need to wait for it to finish (we update its time)
						decrease_time();
					} else {
						if (LOG_DEBUG) console.log("Holding (or pressed) the left arrow: decreasing time until the next phase...")
						let phase = get_animation_phase_based_on_time(time);
						while (get_animation_phase_based_on_time(time) == phase && current_phase > 0) {
							decrease_time();
						}
					}

					// Set the timer to play the previous phase's animation if the user is still holding down the button (to hold the button and decreasing steps)
					if (just_pressed_the_button) {
						// User just started holding the button (the animation decreased its time until the previous phase, now we set a timeout at the end of which,
						//  	if the user is still holding the button, the animation will continue)
						let animation_duration = STEP_DURATION * multiplier;
						// if (animation[current_phase] !== undefined) animation_duration = animation[current_phase].duration();
						start_step_animation_timer(Math.max(time_to_hold_next_phase_button_before_stepping_automatically, animation_duration));
					} else {
						// set the timer to the step duration multiplier
						if (animation[current_phase] !== undefined) start_step_animation_timer(STEP_DURATION * multiplier);
					}

				}
			}
		}
	}

	if (current_phase == animation.length - 1) {
		// Set final text description
		final_rainbow_text_descripiton({
			selector: '.final-description',	// css selector of word container
			minSize: 26,					// in pixels
			maxSize: 28,					// in pixels
			align: 'center',				// align items for letters in flexbox
			rainbow: true,					// enables hue change
			speed: 0.5,						 // 1 is 2PI in rad., 0.5 is PI in rad. etc
			rainbowSpeed: 4,				// speed of hue color change,
			frequency: -2.5					// frequency of sine
		});
	}
}

function animate() {
	setTimeout(() => {
		timeline();
		animate();
	}, ANIMATION_STEP_MULTIPLIER);
}

var disable_scroll_temporarily = false;

function scroll_to_focused_element(element, animation_duration = STEP_DURATION) {
	if (!enable_focus_on_element || disable_scroll_temporarily) return;
	// follow the focus element ("focused_element_to_follow_with_view") with the scroll view, meaning that the view should
	//		always show the focus element make sure to avoid jittering by checking if the focus element is already in view
	focused_element_to_follow_with_view = $(element);
	let screen_center_height_percentage = 5;
	if (focus_element && focused_element_to_follow_with_view != undefined && focused_element_to_follow_with_view.length > 0) {
		if (focused_element_to_follow_with_view.first().offset().top < $('#page').height() * (0.5 - screen_center_height_percentage * 0.01 / 2) || focused_element_to_follow_with_view.first().offset().top > $('#page').height() * (0.5 + screen_center_height_percentage * 0.01 / 2)) {
			let scroll_to = focused_element_to_follow_with_view.first().offset().top - $('#page').height() * 0.5 + $('#page').scrollTop();
			// stop the animation to avoid jittering
			$('#page').stop();
			$('#page').animate({ scrollTop: scroll_to }, animation_duration);
		}
	}
}

function start_step_animation_timer(to_set) {
	step_animation_timer_for_buttons_hold = to_set;
}

function key_controls_handler(keyCode, pressed) {

	// Set flag to indicate that one key was pressed (useful to avoid firing multiple key down events when holding a key)
	holding_keys["one_down"] = pressed;

	holding_keys["ArrowRight"] = pressed && keyCode == 39;
	holding_keys["ArrowLeft"] = pressed && keyCode == 37;

}

function play_pause_animation() {
	// toggle the animation

	if (current_phase == -1) initialize_visuals_and_animation(false, true);
	if (animation.length == 0) return;

	animation_is_playing = !animation_is_playing;

	// Display animation info on pause (in case the animation info were being hidden by the "lower animation speed" message, i.e. animation was auto playing with speed greater than 1.5x)
	if (!animation_is_playing) {
		if (current_phase + 1 < animation.length) display_phase_description_and_code_line(animation[current_phase + 1].phase_info, true);
	}

	// Add class .paused 
	if (animation.length > 0) {
		if (!animation_is_playing) {
			$("#play-pause").removeClass('paused');
		} else {
			$("#play-pause").addClass('paused');
		}
	}

	if (current_phase == animation.length) {
		if (fireworks_are_playing) {
			stop_fireworks();
		} else {
			start_fireworks();
		}
	}
}

function restart(show_confirmation_if_playing = true, custom_confirm_message = "") {

	let confirmed = true;
	let message = custom_confirm_message == "" ? "\nThis will restart the animation.\nDo you really want to restart it?" : custom_confirm_message;
	if (show_confirmation_if_playing && current_phase >= 1 && current_phase < animation.length - 3) confirmed = confirm(message);

	// Reset page, visualization, ecc... to the initial state

	if (confirmed) {

		// Initial input values
		if (num_of_frames_in_buffer == -1) num_of_frames_in_buffer = 3;
		if (num_of_pages_of_file == -1) num_of_pages_of_file = 4;
		if (num_of_records_per_page == -1) num_of_records_per_page = 5;
		if (num_of_records_of_file == -1) num_of_records_of_file = 18;

		let input_controls_content =
			'<div style="visibility: hidden; width: 1000px;"></div>' +
			'<div id="input-values">' +
			'	<div class="input-group">' +
			'		<div>File pages:</div>' +
			'		<div><b>B</b>&ThinSpace;=&ThinSpace;<input type="number" id="file-pages" value="' + num_of_pages_of_file + '" min="1"></div>' +
			'	</div>' +
			'	<div class="input-group">' +
			'		<div>Buffer frames:</div>' +
			'		<div><b>M</b>&ThinSpace;=&ThinSpace;<input type="number" id="frames-in-buffer" value="' + num_of_frames_in_buffer + '" min="1"></div>' +
			'	</div>' +
			'	<div class="input-group">' +
			'		<div>File records:</div>' +
			'		<div><input type="number" id="file-records" value="' + num_of_records_of_file + '" min="1"></div>' +
			'	</div>' +
			'	<div class="input-group">' +
			'		<div>Max records per page:</div>' +
			'		<div><input type="number" id="records-per-page" value="' + num_of_records_per_page + '" min="1" max="' + MAX_RECORDS_PER_PAGE + '"></div>' +
			'	</div>' +
			'</div>';
		// Make the input controls (html above) appear
		$(".current-phase-description > div > span").html(input_controls_content);

		animation_is_playing = false;
		current_phase = -1;
		play_animation_until_next_phase = false;
		decrease_until_previous_phase = false;

		if (selected_algorithm_type == null) selected_algorithm_type = algorithm_type.two_way;
		time = 0;

		$("#play-pause").removeClass('paused');

		hide_runs(0, false);
		hide_runs(0, true);

		$("#file").attr("style", "");
		$("#runs-container").removeClass("transform-to-file");

		delete_records_grayed_copies("#file");
		$("#runs-container").empty();
		$("#runs-container-next").empty();

		stop_fireworks();

		set_functions_to_input_fields();

		initialize_visuals_and_animation(true, false, true);

		move_code_line_to([-1]);

		return true;
	} else {
		return false;;
	}
}

var set_rainbow_text = false;
function final_rainbow_text_descripiton({ minSize, maxSize, selector, align, rainbow, speed, rainbowSpeed, frequency }) {
	if (!set_rainbow_text) {
		let wordContainer = $($(selector)[0]);
		if (wordContainer === undefined || wordContainer.length == 0) return;
		set_rainbow_text = true;
		let word = $(wordContainer).html();
		$(wordContainer).css("align-items", align);
		let spanify = (word) => {
			let HTMLString = ''
			word.split('').forEach(l => {
				l === ' ' ? HTMLString += `<span>&nbsp;</span>` : HTMLString += `<span>${l}</span>`
			})
			return HTMLString;
		}
		$(wordContainer).html(spanify(word));
		let letters = [].slice.call($(wordContainer).find("span"));
		let loop = ms => {
			requestAnimationFrame(loop);
			letters.forEach((l, i) => {
				let fontSize = parseInt(Math.sin(ms / (360 * speed) + (i / frequency)) * (maxSize - minSize) + maxSize, 10);
				l.style.fontSize = `${fontSize}px`;
				if (rainbow) {
					l.style.color = `hsl(${ms / rainbowSpeed + i * 20}, 50%, 50%)`;
					l.style.textShadow = ` 0 0 15px hsl(${ms / rainbowSpeed + i * 20}, 50%, 50%)`;
				}
			})
		}
		loop(0);
	}
}

function add_button_functions() {

	// Algorithm side-tab collapse button
	$("#collapse-arrow").click(function () {
		// NOTE: if this element is clicked while the aimation is in a state on which records are NOT 
		// in their normal page position, then the various pages will move from their position because of the resize of the page
		let confirmed = true;
		if (current_phase > 1 && current_phase < animation.length - 3) {
			confirmed = confirm("\nYou are trying to collapse the algorithm side-bar after the animation started.\n\nThis may cause visual errors with the position of the elements on the screen, which will then be gradually fixed while the animation continues playing (to avoid this, restart the animation and collapse the algorithm side bar before the animation starts).\n\nDo you really want to collapse the algorithm now?");
		}
		if (confirmed) {
			$(this).parent().toggleClass('collapsed');
		}
	});

	// Add functions to the algorithm selector buttons
	let change_algorithm_confirm_message = "\nYou are trying to change the algorithm after the animation started.\n\nThis will restart the animation.\n\nDo you really want to change the algorithm?"
	$("#algorithm-selector #two-way, #algorithm-selector-alternate #two-way").click(function () {
		if (selected_algorithm_type != algorithm_type.two_way) {
			// Reset animation
			let restarted = restart(undefined, change_algorithm_confirm_message);
			if (restarted) {

				// Set button(s) as selected
				$("#algorithm-selector div, #algorithm-selector-alternate div").removeClass("selected");
				$("#algorithm-selector #two-way").addClass('selected');
				$("#algorithm-selector-alternate #two-way").addClass('selected');

				// Show corresponding algorithm
				$("#algorithm .code-container").css('display', 'none');
				$("#algorithm .two-way").css('display', 'block');

				$("#frame-buffer").removeClass('replacement-selection');
				$("#frame-buffer").removeClass('single-column');

				selected_algorithm_type = algorithm_type.two_way;
			}
		}
	});
	$("#algorithm-selector #k-way, #algorithm-selector-alternate #k-way").click(function () {
		if (selected_algorithm_type != algorithm_type.k_way) {
			// Reset animation
			let restarted = restart(undefined, change_algorithm_confirm_message);
			if (restarted) {


				// Set button as selected
				$("#algorithm-selector div, #algorithm-selector-alternate div").removeClass("selected");
				$("#algorithm-selector #k-way").addClass('selected');
				$("#algorithm-selector-alternate #k-way").addClass('selected');

				// Show corresponding algorithm
				$("#algorithm .code-container").css('display', 'none');
				$("#algorithm .k-way").css('display', 'block');

				$("#frame-buffer").removeClass('replacement-selection');
				$("#frame-buffer").removeClass('single-column');

				selected_algorithm_type = algorithm_type.k_way;
			}
		}
	});
	$("#algorithm-selector #replacement-selection, #algorithm-selector-alternate #replacement-selection").click(function () {
		if (selected_algorithm_type != algorithm_type.replacement_selection) {
			// Reset animation
			let restarted = restart(undefined, change_algorithm_confirm_message);
			if (restarted) {

				// Set button as selected
				$("#algorithm-selector div, #algorithm-selector-alternate div").removeClass("selected");
				$("#algorithm-selector #replacement-selection").addClass('selected');
				$("#algorithm-selector-alternate #replacement-selection").addClass('selected');

				// Show corresponding algorithm
				$("#algorithm .code-container").css('display', 'none');
				$("#algorithm .replacement-selection").css('display', 'block');

				$("#frame-buffer").addClass('replacement-selection');
				$("#frame-buffer").addClass('single-column');

				selected_algorithm_type = algorithm_type.replacement_selection;
			}
		}
	});
	// force click on the "two-way" button on start (to set it as selected algorithm)
	selected_algorithm_type = null;
	$("#algorithm-selector #two-way").click();

	// Add function to the #play-pause button
	$("#play-pause").click(function () {
		play_pause_animation();
	});

	// Add functions to the #speed button
	$("#controls #speed").click(function () {
		let speed_popup = $(this).find(".speed-popup").first();
		speed_popup.toggleClass('showing');
	});
	// Add functions to the #speed button popup
	$("#controls #speed .speed-popup div").click(function () {
		// Set button as selected
		$("#controls #speed .speed-popup div").removeClass("selected");
		$(this).addClass('selected');

		$("#controls #speed .selected-speed").html($(this).html());

		// Set animation speed
		set_selected_speed(Object.keys(animation_velocities)[$(this).index()]);
		should_update_speed = true;
	});
	// make it so that if you click outside the speed popup, it closes
	$(document).mouseup(function (e) {
		var container = $("#controls #speed .speed-popup");
		if (!container.is(e.target) && container.has(e.target).length === 0) {
			if (!$("#controls #speed").is(e.target)) {
				container.removeClass('showing');
			}
		}
	});


	// Add functions to the #options-button button
	$("#options-button").click(function () {
		let speed_popup = $(this).find(".options-popup").first();
		speed_popup.toggleClass('showing');
	});
	// Disable the options popup if the user clicks outside of it
	$(document).mouseup(function (e) {
		var container = $(".options-popup");
		var popup_button = $("#options-button");
		if (!container.is(e.target) && !popup_button.is(e.target) && container.has(e.target).length === 0 && popup_button.has(e.target).length === 0) {
			container.removeClass('showing');
		}
	});

	// Add functions to the toggle buttons #focus-toggle, #code-highlight-toggle, #fireworks-toggle
	$("#focus-toggle").click(function () {
		set_enable_focus_on_element(!enable_focus_on_element);
	});
	$("#code-highlight-toggle").click(function () {
		set_enable_algorithm_lines_highlighting(!enable_algorithm_lines_highlighting);
	});
	$("#fireworks-toggle").click(function () {
		set_enable_fireworks(!enable_fireworks);
	});
	$("#custom-cursor").click(function () {
		set_enable_custom_cursor(!enable_custom_cursor);
	});

	// Add function to the #about-button button
	$("#about-button").click(function () {
		// Show the "#about-popup"
		$("#about-popup").addClass('showing');
		$("#black-overlay").addClass('showing');
	});
	// Add functio to the "close popup" button of the #about-popup
	$("#about-popup #close-about-popup-button").click(function () {
		// Hide the "#instructions-popup"
		$("#about-popup").removeClass('showing');
		$("#black-overlay").removeClass('showing');
	});

	// Add function to the #about-button button
	$("#sorting-tree-button").click(function () {
		if (current_phase == -1 && !animation_is_playing) initialize_animation();
		// Show the "#sorting-tree-popup"
		$("#sorting-tree-popup").addClass('showing');
		$("#black-overlay").addClass('showing');

		// Change the sorting tree text
		let string = "Sorting tree of relation R with B=" + num_of_pages_of_file + " pages, " + num_of_records_of_file + " records, " + num_of_records_per_page + " max records per page and M=" + num_of_frames_in_buffer + " available frames in buffer.<br/>Each line shows the file and sorted runs at the end of each pass of the " + algorithm_type_string_map[selected_algorithm_type] + " algorithm.";
		$("#sorting-tree-popup .sorting-tree-description").html(string);
	});
	// Add functio to the "close popup" button of the #about-popup
	$("#sorting-tree-popup #close-sorting-tree-popup-button").click(function () {
		// Hide the "#instructions-popup"
		$("#sorting-tree-popup").removeClass('showing');
		$("#black-overlay").removeClass('showing');
	});

	// Force click on the #about-button button on start (to show the instructions popup)
	$("#about-button").click();

	// Add functions to the #step-forward and #step-backwards buttons
	$("#step-forward").on("mousedown", function () {

		if (!animation_is_playing) play_animation_until_next_phase = true;
		else animation_is_playing = false;

		$("#play-pause").removeClass('paused');

		if (current_phase == -1) initialize_visuals_and_animation(false, true);
		if (animation.length == 0) return;

		pressed_step_forward_button = true;
	});
	$("#step-forward").on("mouseup mouseleave", function () {
		pressed_step_forward_button = false;
	});
	$("#step-backwards").on("mousedown", function () {

		if (!animation_is_playing) decrease_until_previous_phase = true;
		else animation_is_playing = false;

		if (current_phase <= 0) return;
		$("#play-pause").removeClass('paused');
		pressed_step_backwards_button = true;
	});
	$("#step-backwards").on("mouseup mouseleave", function () {
		pressed_step_backwards_button = false;
	});

	// Add function to the reset button
	$("#restart").click(function () {
		restart();
	});

	// Set input fields functions
	set_functions_to_input_fields();
	// Force change on every input field to set the correct values
	$("input#frames-in-buffer").change();
	$("input#file-pages").change();
	$("input#file-records").change();
	$("input#records-per-page").change();

}

function set_functions_to_input_fields() {
	// Set input fields functions
	$("input#file-pages").on("input", function () {
		// This also changes the number of file records
		let new_file_pages_number = parseInt($(this).val());
		let new_file_records_number;
		if (num_of_records_of_file % num_of_records_per_page != 0) new_file_records_number = (new_file_pages_number - 1) * num_of_records_per_page + (num_of_records_of_file % num_of_records_per_page);
		else new_file_records_number = new_file_pages_number * num_of_records_per_page;

		set_input_values(true, new_file_pages_number, -1, new_file_records_number, -1);
		$("input#file-records").val(new_file_records_number);
	});
	$("input#frames-in-buffer").on("input", function () {
		// Set the number of frames in buffer
		set_input_values(true, -1, parseInt($(this).val()), -1, -1);
	});
	$("input#file-records").on("input", function () {
		// This also changes the num of pages of file
		let new_file_records_number = parseInt($(this).val());
		let new_file_pages_number = num_of_pages_of_file;
		if (new_file_records_number > new_file_pages_number * num_of_records_per_page) {
			new_file_pages_number = Math.ceil(new_file_records_number / num_of_records_per_page);
		} else if (new_file_records_number <= (new_file_pages_number - 1) * num_of_records_per_page) {
			new_file_pages_number = Math.ceil(new_file_records_number / num_of_records_per_page);
		}
		set_input_values(true, new_file_pages_number, -1, new_file_records_number, -1);
		$("input#file-pages").val(new_file_pages_number);
	});
	$("input#records-per-page").on("input", function () {
		// This also changes the number of pages of file
		let new_records_per_page = parseInt($(this).val());
		if (new_records_per_page > MAX_RECORDS_PER_PAGE) {
			new_records_per_page = MAX_RECORDS_PER_PAGE;
			$(this).val(new_records_per_page);
		}
		let new_file_pages_number = num_of_pages_of_file;
		if (new_records_per_page * num_of_pages_of_file < num_of_records_of_file) {
			new_file_pages_number = Math.ceil(num_of_records_of_file / new_records_per_page);
		} else if (new_records_per_page * (num_of_pages_of_file - 1) + 1 > num_of_records_of_file) {
			new_file_pages_number = Math.ceil(num_of_records_of_file / new_records_per_page);
		}
		set_input_values(true, new_file_pages_number, -1, -1, new_records_per_page);
		$("input#file-pages").val(new_file_pages_number);
	});
}

function add_keyboard_functions() {

	// make it so that if the user clicks the spacebar, the "animation_is_playing" variable is toggled
	$(document).keydown(function (e) {
		// spacebar
		if (e.keyCode == 32) {
			e.preventDefault();
			play_pause_animation();
		}
	});

	// Add functions to the arrow buttons
	$(document).keydown(function (e) {
		// avoid keeping the key pressed
		if (!holding_keys["one_down"]) {

			if (e.keyCode == 37 && current_phase <= 0) return;

			key_controls_handler(e.keyCode, true);

			// If the animation is not playing, and the user presses the right arrow key, then the animation will play
			// 		until the next phase is reached
			if (e.keyCode == 39) {
				// right arrow (time increases)

				if (current_phase == -1) initialize_visuals_and_animation(false, true);

				if (!animation_is_playing) play_animation_until_next_phase = true;
				else animation_is_playing = false;

				$("#play-pause").removeClass('paused');

			} else if (e.keyCode == 37) {
				// left arrow (time decreases)

				if (!animation_is_playing) decrease_until_previous_phase = true;
				else animation_is_playing = false;

				$("#play-pause").removeClass('paused');
			}
		}
	});
	$(document).keyup(function (e) {
		// a key is released
		key_controls_handler(e.keyCode, false);
	});

	// Add "quick speed set" functions to buttons "1", "2" and "3" to set speed to the corresponding value
	$(document).keydown(function (e) {
		if (e.keyCode == 49) {
			// 1
			let elem = $("#controls #speed .speed-popup div:nth-child(" + 7 + ")");	// 1x speed
			elem.click();
			elem.click();
		}
		if (e.keyCode == 50) {
			// 2
			let elem = $("#controls #speed .speed-popup div:nth-child(" + 3 + ")");	// 2x speed
			elem.click();
			elem.click();
		}
		if (e.keyCode == 51) {
			// 3
			let elem = $("#controls #speed .speed-popup div:nth-child(" + 1 + ")");	// 3x speed
			elem.click();
			elem.click();
		}
	});

	// Add function to the "R" key to restart the animation
	// NOTE: disabled because it may lead to unwanted restarts if the "R" key is inadvertently pressed
	// $(document).keydown(function (e) {
	// 	if (e.keyCode == 82) {
	// 		// R
	// 		restart();
	// 	}
	// });
}

function initialize_visuals_and_animation(initialize_visuals = true, initialize_animation_phases = true, force_records_refresh = false) {
	if (initialize_visuals) {
		initialize_visualization(num_of_pages_of_file, num_of_frames_in_buffer, num_of_records_of_file, num_of_records_per_page, force_records_refresh);
	}
	if (initialize_animation_phases) {
		if (LOG_DEBUG) console.log("Initializing animation (selected algorithm: " + selected_algorithm_type + ")...");
		current_phase = -1;
		initialize_animation();
	}
}

// Create a single pass "row" for the algorithm tree from given record objects and run pages
function build_single_tree_pass(pass_number, records, run_pages) {

	if (pass_number == -1) {
		// Empty the tree container
		$("#sorting-tree-container").empty();
	}

	let run_html = '<div class="tree-run"></div>';
	let block_html = '<div class="tree-block"></div>';
	let record_html = '<div class="tree-record"></div>';

	let tree_pass_element = $("#sorting-tree-container .tree-pass:nth-child(" + (pass_number + 2) + ")");
	if (tree_pass_element.length == 0) {
		// Create new pass
		tree_pass_element = $('<div class="tree-pass"></div>');
		$("#sorting-tree-container").append(tree_pass_element);
	}

	// Remove records with value -1 (padding records)
	let filtered_records = records.filter(function (record, index) {
		return record.value != -1;
	});

	// Append to the tree_pass_element the runs and their pages (blocks), containing as much records as the number indicated in that list,
	// then also, for each block, assign to the block the "value" contained in the corresponding "records" list (the corresponding record is the one with the same index as the iteration we are considering, meaning records are sorted as if the runs_pages list was "flattened")
	let total_runs;
	let total_pages_of_this_run;
	let total_records_of_this_run_page;
	let total_iterations = Math.ceil(filtered_records.length / num_of_records_per_page) * num_of_records_per_page;
	// tree_pass_element.append(run_html);
	for (let i = 0; i < total_iterations; i++) {

		if (i == 0) {
			$(tree_pass_element).append(run_html);
			$(tree_pass_element).find(".tree-run:last-child").append(block_html);
			total_runs = 1;
			total_pages_of_this_run = 1;
			total_records_of_this_run_page = 0;
		}

		if (total_runs - 1 < run_pages.length && total_pages_of_this_run - 1 < run_pages[total_runs - 1].length &&
			total_records_of_this_run_page >= run_pages[total_runs - 1][total_pages_of_this_run - 1]) {

			function append_remaining_records() {
				// Append remaining "empty" records to the block (before creating a new page or run)
				let remaining_records = num_of_records_per_page - total_records_of_this_run_page;
				for (let j = 0; j < remaining_records; j++) {
					let record_element = $(record_html);
					record_element.addClass("empty");
					$(tree_pass_element).find(".tree-run:last-child .tree-block:last-child").append(record_element);
				}
			}

			if (total_pages_of_this_run + 1 > run_pages[total_runs - 1].length) {

				// Create new run
				if (total_runs + 1 <= run_pages.length) {

					append_remaining_records();

					$(tree_pass_element).append(run_html);
					$(tree_pass_element).find(".tree-run:last-child").append(block_html);
					total_runs += 1;
					total_pages_of_this_run = 1;
					total_records_of_this_run_page = 0;

				} else if (total_runs + 1 > run_pages.length) {

					append_remaining_records();

					// Appended all records: stop
					break;
				}

			} else {

				append_remaining_records();

				// Actually create the new block
				$(tree_pass_element).find(".tree-run:last-child").append(block_html);
				total_pages_of_this_run += 1;
				total_records_of_this_run_page = 0;
			}

		}

		let record_element = $(record_html);
		if (i < filtered_records.length && filtered_records[i].value != -1) {
			let color = calculate_record_color_css_from_value(filtered_records[i].value);
			$(record_element).css('background-color', color);
		} else {
			$(record_element).addClass("empty");
		}

		$(tree_pass_element).find(".tree-run:last-child .tree-block:last-child").append(record_element);

		total_records_of_this_run_page += 1;

	}
}

var window_width = window.innerWidth;

// Detect window horizontal resize, not vertical resize
$(window).resize(function () {
	if (window.innerWidth != window_width) {

		window_width = window.innerWidth;

		if (current_phase >= 2 && current_phase < animation.length - 3) {
			if (LOG_DEBUG) console.log("Window resized horizontally while animation is playing");
			alert("\nYou zoomed in/out or resied the window while the animation already started.\n\nThis may cause visual errors with the position of the elements on the screen, which will then be gradually fixed while the animation continues playing (to avoid this, restart the animation and resize the window before the animation starts).");
		}
	}
});

window.onerror = function () {
	let restart_option = confirm("\nAn error occurred....\n\nDo you want to reset the page?");
	if (restart_option) restart(false);
	else alert("\nThe page will not be resetted, but the animation may not work properly.");
}

$(document).ready(function () {

	set_selected_speed("speed_1_00"); // Starting with 1x speed
	update_actual_speed();	// Update actual speed based on selected speed

	// Add button functions
	add_button_functions();

	// Add keyboard functions
	add_keyboard_functions();

	animate();

	start_updating_phase_of_animation_completion_timer();

});