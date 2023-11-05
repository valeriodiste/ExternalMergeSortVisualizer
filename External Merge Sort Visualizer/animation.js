

var animation = [];
let multiplier = 1.6;
let normal_delay = () => {
	return STEP_DURATION * multiplier;
}
let in_buffer_normal_delay = () => {
	return normal_delay() / 2;
}

function get_record_description_string(record, record_text = "r") {
	let record_string = "<b>" + record_text + "&ThinSpace;=&ThinSpace;</b><span class=\"description-record\" style=\"background-color: " + $(record).css("background-color") + ";\">";
	record_string += $(record).attr("value");
	record_string += "</span>";
	return record_string;
}

function logN(base, n) {
	return Math.log(n) / Math.log(base);
}
function get_num_and_pages_of_runs_after_pass(pass_i) {
	let num_of_runs = 0;
	let num_of_pages_of_each_run = 0;
	let num_of_available_frames = num_of_frames_in_buffer - 1;
	if (selected_algorithm_type == algorithm_type.two_way) {
		num_of_runs = Math.ceil(num_of_pages_of_file / Math.pow(num_of_available_frames, pass_i));
		num_of_pages_of_each_run = Math.pow(num_of_available_frames, pass_i);
	} else if (selected_algorithm_type == algorithm_type.k_way) {
		num_of_runs = Math.ceil(num_of_pages_of_file / (Math.pow(num_of_available_frames, pass_i) * num_of_frames_in_buffer))
		num_of_pages_of_each_run = Math.pow(num_of_available_frames, pass_i) * num_of_frames_in_buffer;
	} else if (selected_algorithm_type == algorithm_type.replacement_selection) {
		num_of_runs = -1;
		num_of_pages_of_each_run = -1;
	}
	return [num_of_runs, num_of_pages_of_each_run];
}

function initialize_animation() {

	animation = [];

	let pass_number_to_set_1 = -1;

	// Check if inputs are correct
	var invalid_records =
		num_of_records_per_page > MAX_RECORDS_PER_PAGE ||
		num_of_records_per_page < 1;
	var invalid_frames =
		num_of_frames_in_buffer <= 2;
	if (invalid_records || invalid_frames) {
		if (invalid_records) alert('Invalid number of records per page: ' + num_of_records_per_page + '\nMinimum is 1 record per page, max is ' + MAX_RECORDS_PER_PAGE + ' records per page (because otherwise records would be so thin that they would be impossible to see).');
		if (invalid_frames) alert('Invalid number of frames in buffer: ' + num_of_frames_in_buffer + '\nExternal merge sort cannot be performed with less than 3 frames in the buffer.');
		return;
	}

	// used to set the phase_info.code_line_offset value, for all phases after pass 0
	let highlight_lines_offset = 0;

	let num_of_available_frames = num_of_frames_in_buffer - 1;

	// NOTE: this is the TOTAL number of needed passes, including pass 0
	var max_num_of_needed_passes = 1;
	if (selected_algorithm_type == algorithm_type.two_way) {
		// Ceil[ log_f(B) + 1 ]  with f = M-1
		max_num_of_needed_passes = Math.ceil(logN(num_of_available_frames, num_of_pages_of_file) + 1);
	} else if (selected_algorithm_type == algorithm_type.k_way) {
		// Ceil[ log_f(Ceil[ B/M ]) ]  with f = M-1
		max_num_of_needed_passes = Math.ceil(logN(num_of_available_frames, Math.ceil(num_of_pages_of_file / num_of_frames_in_buffer)) + 1);
	} else if (selected_algorithm_type == algorithm_type.replacement_selection) {
		max_num_of_needed_passes = Math.ceil(logN(num_of_available_frames, num_of_records_of_file) + 1);
		highlight_lines_offset = 25 - 7;	// the number before the " - 7" is the line numer of the line in the algorithm code on the side with the comment "// Pass i"
	}

	/**
	 * @description All records list, in the order they are in the file (the order and properties of each of the records in this list, hence value, page and number in file,
	 * 		gets updated at the end of each pass, pass 0 included, while before pass 0 it is equal to the order the records are initialized with, hence a random order)
	 * <br/>NOTE: this list may contain elements with value = -1, which means that there is an empty space in the slot represented by that record in the actual file
	 * 		(this may happen in the replacement selection algorithm, in which runs are dishomogeneous and in which the totla number of pages created may be bigger
	 * 		than the original number of pages of the file, hence there may be empty spaces in pages of the file)
	 * @structure
	 * ```
	 * {
	 *   value: number,
	 *   page_in_file: number,
	 *   number_in_page_of_file: number
	 * }
	 * ```
	*/
	let all_records = [];
	for (let i = 0; i < num_of_records_of_file; i++) {
		all_records.push({
			value: i + 1,
			page_in_file: 0,
			number_in_page_of_file: 0,
		});
	}
	all_records.sort(function (a, b) { return original_records_values_order[a.value - 1].index - original_records_values_order[b.value - 1].index; });
	function assign_file_pages_and_numbers_to_records_list_based_on_order() {
		for (let i = 0; i < num_of_records_of_file; i++) {
			all_records[i].page_in_file = Math.floor(i / num_of_records_per_page) + 1;
			all_records[i].number_in_page_of_file = i % num_of_records_per_page + 1;
		}
	}
	assign_file_pages_and_numbers_to_records_list_based_on_order();
	if (LOG_DEBUG) console.log("°°°°°°°°°° ALL RECORDS (at start of animation) °°°°°°°°°°")
	if (LOG_DEBUG) console.log(all_records);

	// Build a "records" list to pass to the function to build the sorting tree
	let records_list = [];
	let records_list_in_order_of_file = original_records_values_order.slice();
	records_list_in_order_of_file.sort(function (a, b) { return a.index - b.index; });
	records_list_in_order_of_file.forEach(function (record, index) {
		let value = record.value;
		let page_in_file = Math.floor(index / num_of_records_per_page) + 1;
		let number_in_page_of_file = index % num_of_records_per_page + 1;
		let record_object = {
			value: value,
			page_in_file: page_in_file,
			number_in_page_of_file: number_in_page_of_file
		}
		records_list.push(record_object);
	});
	let runs_pages = [];
	for (let i = 0; i < num_of_pages_of_file; i++) {
		runs_pages.push(num_of_records_per_page);
	}
	build_single_tree_pass(-1, records_list, [runs_pages]);

	// Phase 0 (does nothing, just to show the description of the next phase)
	animation.push({
		// NOTE: This is phase 0
		play: function (animate = true) {
			// Do nothing: this phase was put here to correctly show the description of the next phase (since we always show description of next phase at each phase)

			// Reset the layout of the buffer
			if (selected_algorithm_type == algorithm_type.replacement_selection) {
				$("#frame-buffer").addClass("single-column");
			}

			// Remove any frame-run association numbers from frames of the buffer
			update_frames_run_number_associations();
		},
		phase_info: {
			code_line_offset: 0,
			code_line: [-1],
			pass_number: pass_number_to_set_1,
			io_operations: 0,
			description: function () {
				return "Initializing...";
			}
		},
		rollback: function (animate = false) { },
		duration: function () {
			return STEP_DURATION + pause_in_between_animation_phases
		},
	});
	// Starting animation --------------------------------------------------------------------------------------------------------------
	animation.push({
		// NOTE: This is phase 1
		play: function (animate = true) {
			// Do nothing...
		},
		phase_info: {
			code_line_offset: 0,
			code_line: [1],
			pass_number: pass_number_to_set_1,
			io_operations: 0,
			description: function () {
				return "Starting sorting of relation <b>R</b> with <b>" + num_of_records_of_file + "</b> records (stored in secondary storage, in <b>B=" + num_of_pages_of_file + "</b> page" + (num_of_pages_of_file == 1 ? "" : "s") + " of a file), using <b>M=" + num_of_frames_in_buffer + "</b> frames in the buffer<br/>(in main memory).";
			}
		},
		rollback: function (animate = false) {
			// How the animation should look at the end of the phase
			hide_runs((animate ? undefined : 0));
		},
		duration: function () {
			return normal_delay() + pause_in_between_animation_phases
		},
	});
	// Initialization (setting runs as visible) --------------------------------------------------------------------------------------------------------------
	animation.push({
		// NOTE: This is phase 2
		play: function (animate = true) {
			// Initilaize the visualization
			show_runs((animate ? undefined : 0));
		},
		phase_info: {
			code_line_offset: 0,
			code_line: [(selected_algorithm_type == algorithm_type.replacement_selection ? 1 : 2)],
			pass_number: pass_number_to_set_1,
			io_operations: 0,
			description: function () {
				let append_string_io_ops = " with <b>" + (max_num_of_needed_passes * num_of_pages_of_file * 2) + " I/O operations</b>";
				if (selected_algorithm_type == algorithm_type.replacement_selection) append_string_io_ops = "";
				let append_string = "File will be sorted in <b>" + (max_num_of_needed_passes - 1) + " pass" + (max_num_of_needed_passes - 1 > 1 ? "es" : "") + "</b> (<b>excluding</b> pass 0)" + append_string_io_ops + ".";
				if (selected_algorithm_type == algorithm_type.replacement_selection) append_string = "";
				return "Starting <b>pass 0</b> of the <b>" + algorithm_type_string_map[selected_algorithm_type] + "</b> algorithm. " + append_string;
			}
		},
		rollback: function (animate = false) {
			show_runs((animate ? undefined : 0));
			move_page_to_original_position(1, 0, (animate ? undefined : 0), (animate ? true : false));

			// Delete records grayed copied
			delete_records_grayed_copies("#file");

			// Remove any frame-run association numbers from frames of the buffer
			update_frames_run_number_associations();
		},
		duration: function () {
			return normal_delay() + pause_in_between_animation_phases
		},
	});

	/**
	 * @description List containing, for each run number (as the index i such that "run_num = i+1"), its total number of records in the run
	 * @example [ [5,5,2], [5,3], [3] ]
	 */
	let created_runs_records = [];

	// Populates animations for the 2-way algorithm
	function build_2_way_pass_0() {

		// #####  2-WAY  ###############################################################################################################################################################################
		// Move one page in frame, sort page's records, move page to a new run #########################################################################################################################

		let pass_number_to_set = 0;

		for (let i = 0; i < num_of_pages_of_file; i++) {

			// File page and frame to move to
			let page_number = i + 1;
			let frame_number = 1;

			// Runs to move to (after sorting)
			let num_of_pages_per_run = 1;
			let run_number = Math.ceil(page_number / num_of_pages_per_run);
			let run_page_number = ((page_number - 1) % num_of_pages_per_run) + 1;

			// move page to frame =======================================================================================
			animation.push({
				play: function (animate = true) {
					// create copies of records of file
					if (page_number == 1) {
						create_records_grayed_copies("#file");
					}
					set_single_run(run_number, num_of_pages_per_run);
					move_page_to_frame(page_number, frame_number, 0, (animate ? undefined : 0));
				},
				phase_info: {
					code_line_offset: 0,
					code_line: [3],
					pass_number: pass_number_to_set,
					io_operations: 1,
					description: function () {
						return "Loading page <b>P" + page_number + "</b> of the file to frame <b>F" + frame_number + "</b> of the buffer.";
					}
				},
				rollback: function (animate = false) {
					set_single_run(run_number, num_of_pages_per_run);
					reorder_records_of_page_based_on_original_values(page_number, 0, 0, (animate ? undefined : 0));

				},
				duration: function () {
					return normal_delay() + pause_in_between_animation_phases
				},
			});
			// sort records of page ======================================================================================
			animation.push({
				play: function (animate = true) {
					sort_records_of_page(page_number, 0, 0, (animate ? undefined : 0));
				},
				phase_info: {
					code_line_offset: 0,
					code_line: [4],
					pass_number: pass_number_to_set,
					io_operations: 0,
					description: function () {
						return "Sorting records of page in frame <b>F" + frame_number + "</b>.";
					}
				},
				rollback: function (animate = false) {
					hide_single_run(run_number, 0, (animate ? undefined : 0));
					sort_records_of_page(page_number, 0, 0, (animate ? undefined : 0));
				},
				duration: function () {
					return normal_delay() + pause_in_between_animation_phases + ((run_page_number != 1) ? ANIMATION_STEP_MULTIPLIER : 0)
				},
			});
			// create run page ============================================================================
			animation.push({
				play: function (animate = true) {
					show_single_run(run_number, 0, (animate ? undefined : 0));
				},
				phase_info: {
					code_line_offset: 0,
					code_line: [5],
					pass_number: pass_number_to_set,
					io_operations: 0,
					description: function () {
						return "Creating a new run <b>R" + run_number + "</b> of <b>one</b> page in secondary storage to store the sorted records currently in frame <b>F" + frame_number + "</b>.";
					}
				},
				rollback: function (animate = false) {
					show_single_run(run_number, 0, (animate ? undefined : 0));
					move_page_to_frame(page_number, frame_number, 0, (animate ? undefined : 0));
				},
				duration: function () {
					return normal_delay() + pause_in_between_animation_phases
				},
			});
			// move page to run ======================================================================================
			animation.push({
				play: function (animate = true) {
					let delay = 0;
					if (get_run_page(run_number, run_page_number) == null) {
						if (LOG_DEBUG) console.log("WARNING: Run page we are trying to move to is null: this is probably because of rollbacks (step backwards) of animation phases, which set the run to a run having a different number of pages...\nTo fix this, we are re-setting the run to have the correct number of pages");
						set_single_run(run_number, num_of_pages_per_run);
						delay = STEP_DURATION * 0.2;
					}
					move_page_to_run(page_number, run_number, run_page_number, delay, (animate ? undefined : 0));
				},
				phase_info: {
					code_line_offset: 0,
					code_line: [5],
					pass_number: pass_number_to_set,
					io_operations: 1,
					description: function () {
						return "Writing the sorted records of page <b>P" + page_number + "</b> (in frame <b>F" + frame_number + "</b>) to run <b>R" + run_number + "</b><br/>(in secondary storage).";
					}
				},
				rollback: function (animate = false) {

					// undo next phase
					if (page_number < num_of_pages_of_file) {
						// move previous page, which should be in frame, back to ist original position
						move_page_to_original_position(page_number + 1, 0, (animate ? undefined : 0));
					} else if (page_number == num_of_pages_of_file) {
						// This is the last "phase" of pass 0

						// Hide new runs container
						hide_runs((animate ? undefined : 0), true);
						// For each record, snap it to its runs container position (along with its grayed copy)
						let pos_x = $("#runs-container .block").offset().left;
						snap_all_records_to_horizontal_position(pos_x, num_of_pages_of_file);

						// Delete (eventually present) grayed copies of records in the #runs-container
						delete_records_grayed_copies("#runs-container");

						show_runs((animate ? undefined : 0));

						// Reset runs
						let num_of_runs_to_produce = num_of_pages_of_file;
						for (let i = 0; i < num_of_runs_to_produce; i++) {
							let num_of_pages_per_run = 1;
							let run_number = i + 1;
							set_single_run(run_number, num_of_pages_per_run);
							show_single_run(run_number, 0, (animate ? undefined : 0));
						}

						// Remove any frame-run association numbers from frames of the buffer
						update_frames_run_number_associations();
					}

					move_page_to_run(page_number, run_number, run_page_number, 0, (animate ? undefined : 0));

				},
				duration: function () {
					return normal_delay() + pause_in_between_animation_phases
				},
			});
		}

		// Update actual records list ("all_records" list)
		// i.e. for each group of "num_of_Records_per_page" records, sort them based on their value
		let new_records_list = [];
		for (let i = 0; i < num_of_pages_of_file; i++) {
			let records_of_page = all_records.slice(i * num_of_records_per_page, (i + 1) * num_of_records_per_page);
			records_of_page.sort(function (a, b) { return a.value - b.value; });
			new_records_list = new_records_list.concat(records_of_page);
		}
		all_records = new_records_list.slice();
		assign_file_pages_and_numbers_to_records_list_based_on_order();
		if (LOG_DEBUG) console.log("°°°°°°°°°° ALL RECORDS (after pass 0 of 2-way) °°°°°°°°°°");
		if (LOG_DEBUG) console.log(all_records);

	}

	// Populate animation for the k-way algorithm
	function build_k_way_pass_0() {
		// #####  K-WAY  ###############################################################################################################################################################################
		// Move M pages in frame, sort all M pages' records, move pages to a new run (of M pages) ######################################################################################################

		let pass_number_to_set = 0;

		for (let i = 0; i < num_of_pages_of_file; i++) {

			// File page and frame to move to
			let page_number = i + 1;
			let frame_number = i % num_of_frames_in_buffer + 1;

			// Runs to move to (after sorting)
			let num_of_pages_per_run = num_of_frames_in_buffer;
			let run_number = Math.ceil(page_number / num_of_pages_per_run);
			let run_page_number = ((page_number - 1) % num_of_pages_per_run) + 1;

			// move page to frame =======================================================================================
			animation.push({
				play: function (animate = true) {

					if (page_number == 1) {
						// create copies of records of file
						create_records_grayed_copies("#file");
					}
					if (run_page_number == 1) {
						// Create the run to store the records of this group of M pages (M is TOTAL number of frames in buffer)
						set_single_run(run_number, num_of_pages_per_run);
					}

					// Move the page to the frame
					move_page_to_frame(page_number, frame_number, 0, (animate ? undefined : 0));
				},
				phase_info: {
					code_line_offset: 0,
					code_line: [3],
					pass_number: pass_number_to_set,
					io_operations: 1,
					description: function () {
						return "Loading page <b>P" + page_number + "</b> of the file to frame <b>F" + frame_number + "</b> of the buffer.";
					}
				},
				rollback: function (animate = false) {

					if (run_page_number == 1) {
						set_single_run(run_number, num_of_pages_per_run);
					}
					move_page_to_frame(page_number, frame_number, 0, (animate ? undefined : 0));

					if ((page_number - 1) % num_of_frames_in_buffer + 1 == num_of_frames_in_buffer || page_number == num_of_pages_of_file) {
						// If this page is the Mth of an M pages group, should reorder its and the previous M-1 pages's records based on the original values

						let first_page_in_buffer = page_number - num_of_frames_in_buffer + 1;
						if (page_number == num_of_pages_of_file) first_page_in_buffer = page_number - ((page_number - 1) % num_of_frames_in_buffer);
						let last_page_in_buffer = page_number;
						reorder_records_of_multiple_pages_based_on_original_values(first_page_in_buffer, last_page_in_buffer, 0, 0, (animate ? undefined : 0));

					} else {
						// This is NOT the Mth page of an M pages group (meaning we are still loading pages until the buffer is full) move the next page back to its original position
						if (page_number < num_of_pages_of_file) {
							move_page_to_original_position(page_number + 1, 0, (animate ? undefined : 0));
						}
					}

				},
				duration: function () {
					return normal_delay() + pause_in_between_animation_phases
				},
			});
			// When we are done loading M pages, sort their records and then move them into the buffer
			if ((page_number - 1) % num_of_frames_in_buffer + 1 == num_of_frames_in_buffer || page_number == num_of_pages_of_file) {
				let first_page_in_buffer = page_number - num_of_frames_in_buffer + 1;
				if (page_number == num_of_pages_of_file) first_page_in_buffer = page_number - ((page_number - 1) % num_of_frames_in_buffer);
				let last_page_in_buffer = page_number;
				// sort records of M pages ======================================================================================
				animation.push({
					play: function (animate = true) {
						if (LOG_DEBUG) console.log("Sorting pages: " + (first_page_in_buffer) + " to " + last_page_in_buffer);
						sort_records_of_multiple_pages_in_buffer(first_page_in_buffer, last_page_in_buffer, 0, 0, (animate ? undefined : 0));
					},
					phase_info: {
						code_line_offset: 0,
						code_line: [4],
						pass_number: pass_number_to_set,
						io_operations: 0,
						description: function () {
							return "Sorting records of all the <b>" + num_of_frames_in_buffer + "</b> page" + (num_of_frames_in_buffer == 1 ? "" : "s") + " in the buffer (from page <b>P" + (first_page_in_buffer) + "</b> to page <b>P" + last_page_in_buffer + "</b> of the file).";
						}
					},
					rollback: function (animate = false) {
						sort_records_of_multiple_pages_in_buffer(first_page_in_buffer, last_page_in_buffer, 0, 0, (animate ? undefined : 0));

						hide_single_run(run_number, 0, (animate ? undefined : 0));
					},
					duration: function () {
						return normal_delay() + pause_in_between_animation_phases
					},
				});
				// create new run ============================================================================
				animation.push({
					play: function (animate = true) {
						show_single_run(run_number, 0, (animate ? undefined : 0));
					},
					phase_info: {
						code_line_offset: 0,
						code_line: [5],
						pass_number: pass_number_to_set,
						io_operations: 0,
						description: function () {
							return "Creating a new run <b>R" + run_number + "</b> of <b>" + num_of_frames_in_buffer + "</b> page" + (num_of_frames_in_buffer == 1 ? "" : "s") + " in secondary storage to store the sorted records in the <b>" + num_of_frames_in_buffer + "</b> frames of the buffer.";
						}
					},
					rollback: function (animate = false) {
						show_single_run(run_number, 0, (animate ? undefined : 0));

						// Move back first of the M pages (moved into a run by the next phase) back to the frame from which it came from (frame 1), hence undoing the next phase
						move_page_to_frame(first_page_in_buffer, 1, 0, (animate ? undefined : 0));
					},
					duration: function () {
						return normal_delay() + pause_in_between_animation_phases
					},
				});
				// move the M pages in buffer to the M run pages =================================================================
				for (let past_page_number = first_page_in_buffer; past_page_number <= last_page_in_buffer; past_page_number++) {
					let run_number_2 = Math.ceil(past_page_number / num_of_pages_per_run);
					let run_page_number_2 = ((past_page_number - 1) % num_of_pages_per_run) + 1;
					let frame_number_2 = past_page_number - first_page_in_buffer + 1;	// For the end_function (undoing the animation)
					// move next one of the M pages in buffer to the new run ======================================================================================
					animation.push({
						play: function (animate = true) {
							let delay = 0;
							if (get_run_page(run_number_2, run_page_number_2) == null) {
								if (LOG_DEBUG) console.log("WARNING: Run page we are trying to move to is null: this is probably because of rollbacks (step backwards) of animation phases, which set the run to a run having a different number of pages...\nTo fix this, we are re-setting the run to have the correct number of pages");
								set_single_run(run_number_2, num_of_pages_per_run);
								delay = STEP_DURATION * 0.2;
							}
							move_page_to_run(past_page_number, run_number_2, run_page_number_2, delay, (animate ? undefined : 0));
						},
						phase_info: {
							code_line_offset: 0,
							code_line: [5],
							pass_number: pass_number_to_set,
							io_operations: 1,
							description: function () {
								return "Writing the sorted records in the buffer (of " + (first_page_in_buffer == last_page_in_buffer ? ("page <b>P" + first_page_in_buffer + "</b>") : ("pages from <b>P" + (first_page_in_buffer) + "</b> to <b>P" + last_page_in_buffer + "</b>")) + ") to run <b>R" + run_number + "</b> of <b>" + num_of_frames_in_buffer + "</b> pages (in secondary storage).";
							}
						},
						rollback: function (animate = false) {

							// Undo next phase
							if (past_page_number < page_number) {
								// move next page of this M (or maybe less if the page is the last) pages group, which should be in frame, back to ist frame position
								move_page_to_frame(past_page_number + 1, frame_number_2 + 1, 0, (animate ? undefined : 0));
							} else {
								if (page_number < num_of_pages_of_file) {
									// Undoing start animatioin of next group of M runs (hence undoing movement of next page into frame 1)
									move_page_to_original_position(page_number + 1, 0, (animate ? undefined : 0));
								} else if (page_number == num_of_pages_of_file) {
									// This is the last page of the file, last iteration of pass 0

									// Hide new runs container
									hide_runs((animate ? undefined : 0), true);
									// For each record, snap it to its runs container position (along with its grayed copy)
									let pos_x = $("#runs-container .block").offset().left;
									snap_all_records_to_horizontal_position(pos_x, num_of_pages_of_file);

									// Delete (eventually present) grayed copies of records in the #runs-container
									delete_records_grayed_copies("#runs-container");

									show_runs((animate ? undefined : 0));

									// Reset runs
									let num_of_runs_to_produce = Math.ceil(num_of_pages_of_file / num_of_frames_in_buffer);
									for (let i = 0; i < num_of_runs_to_produce; i++) {
										let run_number = i + 1;
										set_single_run(run_number, num_of_pages_per_run);
										show_single_run(run_number, 0, (animate ? undefined : 0));
									}

									// Remove any frame-run association numbers from frames of the buffer
									update_frames_run_number_associations();
								}
							}

							move_page_to_run(past_page_number, run_number_2, run_page_number_2, 0, (animate ? undefined : 0));
						},
						duration: function () {
							return normal_delay() + pause_in_between_animation_phases
						},
					});
				}
			}
		}

		// Update actual records list ("all_records" list)
		// i.e. for each group of "num_of_records_per_page * num_of_frames_in_buffer" records, sort them based on their value
		let new_records_list = [];
		for (let i = 0; i < num_of_records_per_page * num_of_frames_in_buffer; i++) {
			let start_index = i * num_of_records_per_page * num_of_frames_in_buffer;
			let end_index = (i + 1) * num_of_records_per_page * num_of_frames_in_buffer;
			if (end_index > all_records.length) end_index = all_records.length;
			let records_of_page = all_records.slice(start_index, end_index);
			records_of_page.sort(function (a, b) { return a.value - b.value; });
			new_records_list = new_records_list.concat(records_of_page);
		}
		all_records = new_records_list.slice();
		assign_file_pages_and_numbers_to_records_list_based_on_order();
		if (LOG_DEBUG) console.log("°°°°°°°°°° ALL RECORDS (after pass 0 of k-way) °°°°°°°°°°");
		if (LOG_DEBUG) console.log(all_records);

	}

	// Populate animation for the replacement selection algorithm
	function build_replacement_selection_pass_0() {

		let pass_number_to_set = 0;

		function get_input_frame_records() {
			// Get the list of records in the "all_records_in_frame_buffer" list which have a "queue_type" of "queue_types.queue_1_records"
			let records = all_records_in_frame_buffer.filter(function (record) {
				return record.queue_type == queue_types.input_frame;
			});
			return records;
		}

		function get_queue_1_records() {
			// Get the list of records in the "all_records_in_frame_buffer" list which have a "queue_type" of "queue_types.queue_1_records"
			let records = all_records_in_frame_buffer.filter(function (record) {
				return record.queue_type == queue_types.queue_1_records;
			});
			return records;
		}

		function get_queue_2_records() {
			// Get the list of records in the "all_records_in_frame_buffer" list which have a "queue_type" of "queue_types.queue_1_records"
			let records = all_records_in_frame_buffer.filter(function (record) {
				return record.queue_type == queue_types.queue_2_records;
			});

			return records;
		}

		/**
		 * @description removes a record from the "all_records_in_frame_buffer" list, only if the record has type "record_obj.queue_type"
		 * equal to the given one, then returns true if the record was removed, false otherwise.
		 */
		function remove_record_from_records_list(record_obj, queue_type) {
			let index_of_record = all_records_in_frame_buffer.findIndex(function (record) {
				return record.queue_type == queue_type && record.page_number_in_file == record_obj.page_number_in_file && record.record_number_in_page_of_file == record_obj.record_number_in_page_of_file;
			});
			if (index_of_record != -1) {
				// Change subsequent records slot numbers
				// 	i.e. move all subsequent records, hence all records with a slot number greater than the one removed, one slot up, hence decrease the slot number by 1
				for (let i = 0; i < all_records_in_frame_buffer.length; i++) {
					if (all_records_in_frame_buffer[i].slot_number > all_records_in_frame_buffer[index_of_record].slot_number) {
						all_records_in_frame_buffer[i].slot_number -= 1;
					}
				}
				// Remove record from list
				all_records_in_frame_buffer.splice(index_of_record, 1);
			}
			else return false;
			return true;
		}

		/**
		 * @description changes the queue type of a record in the "all_records_in_frame_buffer" list to the new "record_obj.queue_type".
		 * @NOTE Also changes the actual slot number of the record itself and, if we are moving to Q1 (hence we are moving it at the end of Q1),
		 * pushes all records of Q2 by one slot down
		 */
		function change_record_queue_type(record_obj, new_queue_type) {
			let index_of_record = all_records_in_frame_buffer.findIndex(function (record) {
				return record.page_number_in_file == record_obj.page_number_in_file && record.record_number_in_page_of_file == record_obj.record_number_in_page_of_file;
			});
			if (index_of_record != -1) {
				// Change record slot number
				all_records_in_frame_buffer[index_of_record].slot_number = num_of_records_per_page + get_queue_1_records().length + (new_queue_type == queue_types.queue_1_records ? 0 : get_queue_2_records().length) + 1;
				// Change subsequent records (queue 2 records) slot numbers
				if (all_records_in_frame_buffer[index_of_record].queue_type == queue_types.input_frame && new_queue_type == queue_types.queue_1_records) {
					// Push all records of Q2 by one slot down
					for (let i = 0; i < all_records_in_frame_buffer.length; i++) {
						if (all_records_in_frame_buffer[i].queue_type == queue_types.queue_2_records) {
							all_records_in_frame_buffer[i].slot_number += 1;
						}
					}
				}
				// Change record queue type
				all_records_in_frame_buffer[index_of_record].queue_type = new_queue_type;
			}
			else return false;
			return true;
		}

		let records_counter_for_run = 0;

		// Create the first run (of 1 pages at start, then might expand to more pages)
		animation.push({
			play: function (animate = true) {
				set_single_run(1, 1);
				show_single_run(1, 0, (animate ? undefined : 0));
				create_records_grayed_copies("#file");

				// Remove any frame-run association numbers from frames of the buffer (might not be needeed, but just in case)
				update_frames_run_number_associations();
			},
			phase_info: {
				code_line_offset: 0,
				code_line: [1],
				pass_number: pass_number_to_set,
				io_operations: 0,
				description: function () {
					return "Creating the first run <b>R1</b> (initially with one page) in secondary storage.";
				}
			},
			rollback: function (animate = false) {
				show_single_run(1, 0, (animate ? undefined : 0));
				create_records_grayed_copies("#file");

			},
			duration: function () {
				return in_buffer_normal_delay() + pause_in_between_animation_phases
			},
		});

		/**
		 * @description records which are NOT in the input frame (nor in the output frame)
		 */
		let all_records_in_frame_buffer = [];
		let records_in_output_frame = [];

		let final_written_records = [
			// {
			// 	value: 0,
			// 	page_in_file: 0,
			// 	number_in_page_of_file: 0,
			// }
		];

		let queue_types = {
			input_frame: 0,
			queue_1_records: 1,
			queue_2_records: 2,
		}

		// Bring first page of R in input frame F1
		animation.push({
			play: function (animate = true) {
				move_page_to_frame(1, 1, 0, (animate ? undefined : 0));

				$("#frame-buffer").addClass("pass-zero");
			},
			phase_info: {
				code_line_offset: 0,
				code_line: [2],
				pass_number: pass_number_to_set,
				io_operations: 1,
				description: function () {
					return "Loading first page of <b>R</b> in input frame <b>F1</b> (in main memory).";
				}
			},
			rollback: function (animate = false) {
				// Does nothing now...
			},
			duration: function () {
				return normal_delay() + pause_in_between_animation_phases
			},
		});
		// Add records in "all_records_in_frame_buffer"
		for (let record_num = 1; record_num <= num_of_records_per_page; record_num++) {
			let record = get_record(1, record_num);
			if (record != null && record != undefined) {
				let record_obj = {
					page_number_in_file: 1,
					record_number_in_page_of_file: record_num,
					queue_type: queue_types.input_frame,
					slot_number: record_num,
					value: parseInt(record.attr("value"))
				}
				all_records_in_frame_buffer.push(record_obj);
			}
		}

		let loaded_pages = 1;

		// Bring next M-2 pages of R in input frame F2, F3, ..., FM-1
		let num_of_pages_to_load = Math.min(num_of_available_frames - 1, num_of_pages_of_file - 1);

		for (let page_n = 2; page_n <= num_of_pages_to_load + 1; page_n++) {
			// Add records in "records_in_normal_frames_of_buffer"
			for (let record_num = 1; record_num <= num_of_records_per_page; record_num++) {
				let record = get_record(page_n, record_num);
				let record_slot_number = (page_n - 1) * num_of_records_per_page + record_num;
				if (record != null && record != undefined) {
					let record_obj = {
						page_number_in_file: page_n,
						record_number_in_page_of_file: record_num,
						queue_type: queue_types.queue_1_records,
						slot_number: record_slot_number,
						value: parseInt(record.attr("value"))
					}
					all_records_in_frame_buffer.push(record_obj);
				}
			}

			// Bring next of the M-2 pages in the buffer (in frames from F2 onwards)
			animation.push({
				play: function (animate = true) {
					// Move page to frame
					move_page_to_frame(page_n, page_n, 0, (animate ? undefined : 0));
				},
				phase_info: {
					code_line_offset: 0,
					code_line: [3],
					pass_number: pass_number_to_set,
					io_operations: 1,
					description: function () {
						let frame_numbers_to_consider = [];
						for (let i = 2; i <= num_of_pages_to_load + 1; i++) frame_numbers_to_consider.push(i);
						return "Loading next " + (num_of_pages_to_load > 1 ? ("<b>" + num_of_pages_to_load + "</b> pages") : "page") + " of <b>R</b> in buffer" + (num_of_pages_to_load > 1 ? "s" : "") + " <b>F" + frame_numbers_to_consider.join("</b>, <b>F") + "</b> (in main memory), which initially represents <b>Q1</b>.";
					}
				},
				rollback: function (animate = false) {
					// Does nothing now...
				},
				duration: function () {
					return normal_delay() + pause_in_between_animation_phases
				},
			});

			loaded_pages++;
		}

		// "Set" queues Q1 and Q2
		animation.push({
			play: function (animate = true) {
				// Make first record of queue 1 (i.e. first record of 2nd page) active
				get_record(2, 1).addClass("first-active");
			},
			phase_info: {
				code_line_offset: 0,
				code_line: [4, 5],
				pass_number: pass_number_to_set,
				io_operations: 0,
				description: function () {
					return "Initializing queues <b>Q1</b> containing records in frames from <b>F1</b> to <b>F" + num_of_available_frames + "</b>, and <b>Q2</b> to an empty queue.";
				}
			},
			rollback: function (animate = false) {
				// Does nothing now...
			},
			duration: function () {
				return normal_delay() + pause_in_between_animation_phases
			},
		});

		// This "max_iterations" may be deleted, used only to avoid infinite loops
		let max_iterations = num_of_records_of_file * 5;
		let last_created_run_number = 1;
		let next_run_page_number = 1;
		while ((get_queue_1_records().length > 0 || get_queue_2_records().length > 0 || get_input_frame_records().length > 0) && max_iterations-- > 0) {

			let all_records_in_frame_buffer_for_this_iteration_1 = [];
			all_records_in_frame_buffer.forEach(function (record) {
				all_records_in_frame_buffer_for_this_iteration_1.push(copy_record_obj(record));
			});

			if (get_queue_1_records().length == 0) {

				let new_run_number_for_this_iteration_at_start = last_created_run_number + 1;
				let run_page_number_for_this_iteration_at_start = next_run_page_number;

				if (get_queue_2_records().length > 0) {
					// Move all records in q2 to q1 (i.e. also change records appearance, opacity)
					animation.push({
						play: function (animate = true) {
							scroll_to_focused_element($("#file"));
							// Change records appearance, opacity (set as inactive)
							for (let i = 0; i < all_records_in_frame_buffer_for_this_iteration_1.length; i++) {
								let record = all_records_in_frame_buffer_for_this_iteration_1[i];
								if (record.queue_type == queue_types.queue_2_records) {
									let record_element = get_record(record.page_number_in_file, record.record_number_in_page_of_file);
									record_element.removeClass("inactive");
									record_element.removeClass("first-inactive");

									if (record.slot_number == num_of_records_per_page + 1) {
										record_element.addClass("first-active");
									}
								}
							}
						},
						phase_info: {
							code_line_offset: 0,
							code_line: [7, 8],
							pass_number: pass_number_to_set,
							io_operations: 0,
							description: function () {
								return "Queue <b>Q1</b> is empty: moving all records from <b>Q2</b> to <b>Q1</b>.";
							}
						},
						rollback: function (animate = false) {
							// Does nothing now...
						},
						duration: function () {
							return in_buffer_normal_delay() + pause_in_between_animation_phases
						},
					});
					// Actually move records in list (hence change their queue type, and slot maybe?)
					for (let i = 0; i < all_records_in_frame_buffer.length; i++) {
						let record = all_records_in_frame_buffer[i];
						if (record.queue_type == queue_types.queue_2_records) {
							change_record_queue_type(record, queue_types.queue_1_records);
						}
					}
				}

				// Empty output frame (if needed)
				if (records_in_output_frame.length > 0) {

					let run_number_for_this_iteration_start = last_created_run_number;
					let run_page_number_for_this_iteration_start = next_run_page_number;

					let records_in_outut_frame_for_this_run_start = [];
					records_in_output_frame.forEach(function (record) {
						records_in_outut_frame_for_this_run_start.push(copy_record_obj(record));
					});

					// We need to create a new run page
					if (next_run_page_number > 1) {
						animation.push({
							play: function (animate = true) {
								set_single_run(run_number_for_this_iteration_start, run_page_number_for_this_iteration_start);
								show_single_run(run_number_for_this_iteration_start, 0, 0);
							},
							phase_info: {
								code_line_offset: 0,
								code_line: [9, 10],
								pass_number: pass_number_to_set,
								io_operations: 0,
								description: function () {
									return "Creating a new page <b>P" + run_page_number_for_this_iteration_start + "</b> for run <b>R" + run_number_for_this_iteration_start + "</b> to store the records of the output frame <b>F" + num_of_frames_in_buffer + "</b>.";
								}
							},
							rollback: function (animate = false) {
								// Does nothing now...
							},
							duration: function () {
								return normal_delay() + pause_in_between_animation_phases
							},
						});
					}

					// Move all records currently in output frame to the run
					animation.push({
						play: function (animate = true) {
							// Move all records currently in output frame to the run
							let delay = 0;
							if (get_run_page(run_number_for_this_iteration_start, run_page_number_for_this_iteration_start) == null) {
								if (LOG_DEBUG) console.log("WARNING: Run page we are trying to move to is null: this is probably because of rollbacks (step backwards) of animation phases, which set the run to a run having a different number of pages...\nTo fix this, we are re-setting the run to have the correct number of pages");
								set_single_run(run_number_for_this_iteration_start, run_page_number_for_this_iteration_start);
								delay = STEP_DURATION * 0.2;
							}
							records_in_outut_frame_for_this_run_start.forEach(function (record, index) {
								let slot_in_run = index + 1;
								move_record_to_run(record.page_number_in_file, record.record_number_in_page_of_file,
									run_number_for_this_iteration_start, run_page_number_for_this_iteration_start, delay, (animate ? undefined : 0), false, slot_in_run);

								scroll_to_focused_element(get_run_page(run_number_for_this_iteration_start, run_page_number_for_this_iteration_start));
							});
						},
						phase_info: {
							code_line_offset: 0,
							code_line: [9, 10],
							pass_number: pass_number_to_set,
							io_operations: 1,
							description: function () {
								return "Writing records of the output frame <b>F" + num_of_frames_in_buffer + "</b> to page <b>P" + run_page_number_for_this_iteration_start + "</b> of run <b>R" + run_number_for_this_iteration_start + "</b>.";
							}
						},
						rollback: function (animate = false) {
							// Does nothing now...
						},
						duration: function () {
							return normal_delay() + pause_in_between_animation_phases
						},
					});

					records_counter_for_run += records_in_output_frame.length;

					// Add records in output frame (plus padding if needed) to the final written records list (before emptying the output records list)
					let final_written_records_last_written_page = 0;
					if (final_written_records.length > 0) final_written_records_last_written_page = final_written_records[final_written_records.length - 1].page_in_file;
					for (let i = 0; i < num_of_records_per_page; i++) {
						let record_page_in_file = final_written_records_last_written_page + 1;
						let rec_obj = {
							value: -1,
							page_in_file: record_page_in_file,
							number_in_page_of_file: i + 1
						}
						if (i < records_in_output_frame.length) {
							rec_obj.value = records_in_output_frame[i].value;
						}
						final_written_records.push(rec_obj);
					}

					next_run_page_number += 1;
					records_in_output_frame = [];
				}

				// Create a new run (of 1 pages at start, then might expand to more pages)
				animation.push({
					play: function (animate = true) {
						set_single_run(new_run_number_for_this_iteration_at_start, 1);
						show_single_run(new_run_number_for_this_iteration_at_start, 0, (animate ? undefined : 0));
					},
					phase_info: {
						code_line_offset: 0,
						code_line: [11],
						pass_number: pass_number_to_set,
						io_operations: 0,
						description: function () {
							return "Run <b>R" + (new_run_number_for_this_iteration_at_start - 1) + "</b> is complete (with <b>" + run_page_number_for_this_iteration_at_start + "</b> pages): creating a new run <b>R" + new_run_number_for_this_iteration_at_start + "</b>.";
						}
					},
					rollback: function (animate = false) {
						// Does nothing now...
					},
					duration: function () {
						return in_buffer_normal_delay() + pause_in_between_animation_phases
					},
				});

				created_runs_records.push(records_counter_for_run);
				records_counter_for_run = 0;

				last_created_run_number += 1;
				next_run_page_number = 1;
			}

			// Create a copy of the "all_records_in_frame_buffer" list
			// Trick used because for the animationo, the list actually retrieves only its last state (hence the empty list at the end) during the actual execution of the animation
			function copy_record_obj(record_to_copy) {
				return {
					page_number_in_file: record_to_copy.page_number_in_file,
					record_number_in_page_of_file: record_to_copy.record_number_in_page_of_file,
					queue_type: record_to_copy.queue_type,
					slot_number: record_to_copy.slot_number,
					value: record_to_copy.value
				};
			}

			// Find minium record r1 in Q1 (and set it to be pointed)
			let r1 = get_queue_1_records().reduce(function (prev, curr) {
				return prev.value < curr.value ? prev : curr;
			});
			let record_r1 = get_record(r1.page_number_in_file, r1.record_number_in_page_of_file);	// actual record element (in the page)
			animation.push({
				play: function (animate = true) {
					scroll_to_focused_element($("#file"));
					record_r1.addClass("pointed");
				},
				phase_info: {
					code_line_offset: 0,
					code_line: [12],
					pass_number: pass_number_to_set,
					io_operations: 0,
					description: function () {
						return "The mimium record of queue <b>Q1</b> is " + get_record_description_string(record_r1, "r1") + ".";
					}
				},
				rollback: function (animate = false) {
					// Does nothing now...
				},
				duration: function () {
					return in_buffer_normal_delay() + pause_in_between_animation_phases
				},
			});

			let removed_record_slot_number = r1.slot_number;
			let current_num_of_records_in_output_frame = records_in_output_frame.length;

			let input_frame_is_empty = get_input_frame_records().length == 0;

			let more_pages_to_load = loaded_pages + 1 <= num_of_pages_of_file;

			// Move r1 in output frame
			animation.push({
				play: function (animate = true) {

					move_record_to_new_slot_in_another_frame(r1.page_number_in_file, r1.record_number_in_page_of_file, num_of_available_frames + 1, current_num_of_records_in_output_frame + 1, (animate ? undefined : 0));

					if (input_frame_is_empty && !more_pages_to_load) {
						record_r1.removeClass("pointed");
					}

					record_r1.removeClass("first-active");
					// Find first record in Q1 (i.e. record in Q1 with the minimum slot number) and set it as first-active
					let remaining_records_in_q1 = all_records_in_frame_buffer_for_this_iteration_1.filter(function (record) {
						return (record.page_number_in_file != r1.page_number_in_file || record.record_number_in_page_of_file != r1.record_number_in_page_of_file) &&
							record.queue_type != queue_types.input_frame;
					});
					if (remaining_records_in_q1.length > 0) {
						let first_record_obj_in_q1 = remaining_records_in_q1.reduce(function (prev, curr) {
							return prev.slot_number < curr.slot_number ? prev : curr;
						});
						let first_record_in_q1 = get_record(first_record_obj_in_q1.page_number_in_file, first_record_obj_in_q1.record_number_in_page_of_file);
						first_record_in_q1.addClass("first-active");

						scroll_to_focused_element(get_frame(num_of_available_frames + 1));
					}

					for (let i = 0; i < all_records_in_frame_buffer_for_this_iteration_1.length; i++) {
						record = all_records_in_frame_buffer_for_this_iteration_1[i];
						if (record.slot_number > removed_record_slot_number && record.queue_type != queue_types.input_frame) {
							let new_slot_number = record.slot_number - 1;
							let record_frame_number = Math.ceil(new_slot_number / num_of_records_per_page);
							let record_slot_number = (new_slot_number - 1) % num_of_records_per_page + 1;
							move_record_to_new_slot_in_another_frame(record.page_number_in_file, record.record_number_in_page_of_file, record_frame_number, record_slot_number, (animate ? undefined : 0));
						}
					};

				},
				phase_info: {
					code_line_offset: 0,
					code_line: [13],
					pass_number: pass_number_to_set,
					io_operations: 0,
					description: function () {
						return "Moving min record " + get_record_description_string(record_r1, "r1") + " of queue <b>Q1</b> in output frame <b>F" + num_of_frames_in_buffer + "</b>.";
					}
				},
				rollback: function (animate = false) {
					// Does nothing now...
				},
				duration: function () {
					return in_buffer_normal_delay() + pause_in_between_animation_phases
				},
			});
			// Remove found record r1 from the "all_records_in_frame_buffer" list (i.e. from queue 1)
			remove_record_from_records_list(r1, queue_types.queue_1_records);

			// Move record in output frame list of records
			records_in_output_frame.push(r1);

			let all_records_in_frame_buffer_for_this_iteration_2 = [];
			all_records_in_frame_buffer.forEach(function (record) {
				all_records_in_frame_buffer_for_this_iteration_2.push(copy_record_obj(record));
			});

			// If F1 is empty
			if (get_input_frame_records().length == 0) {

				// If F1 is empty (hence no more records in input frame), load next page of R in input frame F1 (if possble)

				let page_to_load = loaded_pages + 1;
				if (page_to_load <= num_of_pages_of_file) {
					// Bring next page of R in input frame F1
					animation.push({
						play: function (animate = true) {
							move_page_to_frame(page_to_load, 1, 0, (animate ? undefined : 0));
						},
						phase_info: {
							code_line_offset: 0,
							code_line: [14, 15],
							pass_number: pass_number_to_set,
							io_operations: 1,
							description: function () {
								return "Input frame <b>F1</b> is empty: loading next page <b>P" + page_to_load + "</b> of <b>R</b> in input frame (in main memory).";
							}
						},
						rollback: function (animate = false) {
							// Does nothing now...
						},
						duration: function () {
							return normal_delay() + pause_in_between_animation_phases
						},
					});
					// Add records in "all_records_in_frame_buffer"
					for (let record_num = 1; record_num <= num_of_records_per_page; record_num++) {
						let record = get_record(page_to_load, record_num);
						if (record != null && record != undefined) {
							let record_obj = {
								page_number_in_file: page_to_load,
								record_number_in_page_of_file: record_num,
								queue_type: queue_types.input_frame,
								slot_number: record_num,
								value: parseInt(record.attr("value"))
							}
							all_records_in_frame_buffer.push(record_obj);
						}
					}

					loaded_pages += 1;
				}
			}

			// Check if F1 is NOT empty (hence we it was actually already full or we just loaded a new page from file because it was empty)
			if (get_input_frame_records().length > 0) {
				// Find r2 = min record in Q1 (and set it to be pointed)
				let r2 = get_input_frame_records()[0];	// record object
				let record_r2 = get_record(r2.page_number_in_file, r2.record_number_in_page_of_file); // actual record element (in the page)
				animation.push({
					play: function (animate = true) {

						record_r2.addClass("pointed");

						scroll_to_focused_element(record_r2);
					},
					phase_info: {
						code_line_offset: 0,
						code_line: [16, 17],
						pass_number: pass_number_to_set,
						io_operations: 0,
						description: function () {
							return "The next record of the input frame <b>F1</b> is " + get_record_description_string(record_r2, "r2") + ".";
						}
					},
					rollback: function (animate = false) {
						// Does nothing now...
					},
					duration: function () {
						return in_buffer_normal_delay() + pause_in_between_animation_phases
					},
				});

				let q1_length = get_queue_1_records().length;	// Here because it changes with the while loop going before the animation plays
				let q2_length = get_queue_2_records().length;	// Here because it changes with the while loop going before the animation plays

				// Move r2 in Q1 (hence "last", next free slot of records in Q1)
				// If r2 > r1
				if (r2.value > r1.value) {
					// Move r2 in Q1 (hence "last", next free slot of records in Q1)
					// 		(should also then push the records in Q2 down to give space for r2)
					animation.push({
						play: function (animate = true) {

							let total_slot_to_move_to = num_of_records_per_page + q1_length + 1; // Global slot, from the first slot of F1, to move the record to (the bottom of the Q1)
							let frame_number_to_move_to = Math.ceil(total_slot_to_move_to / num_of_records_per_page);
							let record_number_to_move_to = (total_slot_to_move_to - 1) % num_of_records_per_page + 1;
							move_record_to_new_slot_in_another_frame(r2.page_number_in_file, r2.record_number_in_page_of_file, frame_number_to_move_to, record_number_to_move_to, (animate ? undefined : 0));

							record_r1.removeClass("pointed");
							record_r2.removeClass("pointed");

							scroll_to_focused_element(get_frame(frame_number_to_move_to));

							// Should push down all other records in Q2 by one slot
							for (let i = 0; i < all_records_in_frame_buffer_for_this_iteration_2.length; i++) {
								let record = all_records_in_frame_buffer_for_this_iteration_2[i];
								if (record.slot_number >= total_slot_to_move_to && record.queue_type == queue_types.queue_2_records) {
									let new_slot_number = record.slot_number + 1;
									let record_frame_number = Math.ceil(new_slot_number / num_of_records_per_page);
									let record_slot_number = (new_slot_number - 1) % num_of_records_per_page + 1;
									move_record_to_new_slot_in_another_frame(record.page_number_in_file, record.record_number_in_page_of_file, record_frame_number, record_slot_number, (animate ? undefined : 0));
								}
							};

						},
						phase_info: {
							code_line_offset: 0,
							code_line: [18, 19],
							pass_number: pass_number_to_set,
							io_operations: 0,
							description: function () {
								return "We have " + get_record_description_string(record_r1, "r1") + " &lt; " + get_record_description_string(record_r2, "r2") + ": moving <b>r2</b> from the input frame <b>F1</b> to queue <b>Q1</b>.";
							}
						},
						rollback: function (animate = false) {
							// Does nothing now...
						},
						duration: function () {
							return in_buffer_normal_delay() + pause_in_between_animation_phases
						},
					});
					// Move r2 from the input frame to Q1
					change_record_queue_type(r2, queue_types.queue_1_records);

				} else {
					// Move r2 in Q2 (at the end of Q2)
					animation.push({
						play: function (animate = true) {
							let total_slot_to_move_to = num_of_records_per_page + q1_length + q2_length + 1; // Global slot, from the first slot of F1, to move the record to (the bottom of the Q1)
							let frame_number_to_move_to = Math.ceil(total_slot_to_move_to / num_of_records_per_page);
							let record_number_to_move_to = (total_slot_to_move_to - 1) % num_of_records_per_page + 1;
							move_record_to_new_slot_in_another_frame(r2.page_number_in_file, r2.record_number_in_page_of_file, frame_number_to_move_to, record_number_to_move_to, (animate ? undefined : 0));
							record_r1.removeClass("pointed");
							record_r2.removeClass("pointed");

							// Set record to be "inactive" (indicating it is now in queue 2)
							record_r2.addClass("inactive");
							if (q2_length == 0) {
								record_r2.addClass("first-inactive");
							}

							scroll_to_focused_element(get_frame(frame_number_to_move_to));

						},
						phase_info: {
							code_line_offset: 0,
							code_line: [20, 21],
							pass_number: pass_number_to_set,
							io_operations: 0,
							description: function () {
								return "We have " + get_record_description_string(record_r1, "r1") + " &ge; " + get_record_description_string(record_r2, "r2") + ": moving <b>r2</b> from the input frame <b>F1</b> to queue <b>Q2</b>.";
							}
						},
						rollback: function (animate = false) {
							// Does nothing now...
						},
						duration: function () {
							return in_buffer_normal_delay() + pause_in_between_animation_phases
						},
					});
					// Move r2 from the input frame to Q2
					change_record_queue_type(r2, queue_types.queue_2_records);
				}

				let all_records_in_frame_buffer_for_this_iteration_3 = [];
				all_records_in_frame_buffer.forEach(function (record) {
					all_records_in_frame_buffer_for_this_iteration_3.push(copy_record_obj(record));
				});
			}

			let records_in_output_frame_for_this_run = [];
			records_in_output_frame.forEach(function (record) {
				records_in_output_frame_for_this_run.push(copy_record_obj(record));
			});

			let last_iteration_check = (get_queue_1_records().length == 0 && get_queue_2_records().length == 0 && get_input_frame_records().length == 0);

			// if output frame is full (or is not full but contains the very last frames of the file, hence must be emptied, meaning that the file has no more records)
			if (records_in_output_frame.length >= num_of_records_per_page || last_iteration_check) {

				let run_number_for_this_iteration = last_created_run_number;
				let run_page_number_for_this_iteration = next_run_page_number;

				// We need to create a second or higher page for the run
				if (next_run_page_number > 1) {
					// Show a new run page
					animation.push({
						play: function (animate = true) {
							set_single_run(run_number_for_this_iteration, run_page_number_for_this_iteration);
							show_single_run(run_number_for_this_iteration, 0, 0);
						},
						phase_info: {
							code_line_offset: 0,
							code_line: [22, 23],
							pass_number: pass_number_to_set,
							io_operations: 0,
							description: function () {
								return "Creating a new page <b>P" + run_page_number_for_this_iteration + "</b> for run <b>R" + run_number_for_this_iteration + "</b> to store the records of the output frame <b>F" + num_of_frames_in_buffer + "</b>.";
							}
						},
						rollback: function (animate = false) {
							// Does nothing now...
						},
						duration: function () {
							return normal_delay() + pause_in_between_animation_phases
						},
					});
				}

				// Move all records currently in output frame to the run
				animation.push({
					play: function (animate = true) {
						// Move all records in output frame to the run

						records_in_output_frame_for_this_run.forEach(function (record, index) {
							let slot_in_run = index + 1;
							move_record_to_run(record.page_number_in_file, record.record_number_in_page_of_file,
								run_number_for_this_iteration, run_page_number_for_this_iteration, 0, (animate ? undefined : 0), false, slot_in_run);

							scroll_to_focused_element(get_run_page(run_number_for_this_iteration, run_page_number_for_this_iteration));
						});
					},
					phase_info: {
						code_line_offset: 0,
						code_line: [23, 24],
						pass_number: pass_number_to_set,
						io_operations: 1,
						description: function () {
							return "Writing records of the output frame <b>F" + num_of_frames_in_buffer + "</b> to page <b>P" + run_page_number_for_this_iteration + "</b> of run <b>R" + run_number_for_this_iteration + "</b>.";
						}
					},
					rollback: function (animate = false) {
						// Does nothing now...
					},
					duration: function () {
						return normal_delay() + pause_in_between_animation_phases
					},
				});

				records_counter_for_run += records_in_output_frame.length;
				if (last_iteration_check) {
					created_runs_records.push(records_counter_for_run);
					records_counter_for_run = 0;
				}

				// Add records in output frame (plus padding if needed) to the final written records list (before emptying the output records list)
				let final_written_records_last_written_page = 0;
				if (final_written_records.length > 0) final_written_records_last_written_page = final_written_records[final_written_records.length - 1].page_in_file;
				for (let i = 0; i < num_of_records_per_page; i++) {
					let record_page_in_file = final_written_records_last_written_page + 1;
					let rec_obj = {
						value: -1,
						page_in_file: record_page_in_file,
						number_in_page_of_file: i + 1
					}
					if (i < records_in_output_frame.length) {
						rec_obj.value = records_in_output_frame[i].value;
					}
					final_written_records.push(rec_obj);
				}

				next_run_page_number += 1;
				records_in_output_frame = [];

			}
		}

		// Reparent file records (create new hidden file pages if needed)
		let runs_created_records_at_end_of_pass_0 = created_runs_records.slice();
		animation.push({
			play: function (animate = true) {

				// Changing layout of the buffer
				$("#frame-buffer").removeClass("single-column");
				$("#frame-buffer").removeClass("pass-zero");

				// Reparent records of file
				let runs_pages = $("#runs-container .block");

				let list_of_runs_tops = [];
				let file_hidden_page_html = '<div class="block invisible"><div class="block-name"></div></div>';

				scroll_to_focused_element($("#file"));

				for (let i = 0; i < runs_pages.length; i++) {
					let page_number = i + 1;
					// Add new pages of file to store the exceeding page numbers records (since the number of pages of each created run may be more than the file's number of pages)
					if (page_number > num_of_pages_of_file) {
						$('#file .blocks-container').first().append(file_hidden_page_html);

					}
					let page = get_file_page(page_number);
					list_of_runs_tops.push($(runs_pages[i]).offset().top - page.offset().top);
				}

				setTimeout(() => {
					reparent_all_records_based_on_top_position(list_of_runs_tops, runs_created_records_at_end_of_pass_0);
				}, ANIMATION_STEP_MULTIPLIER);
			},
			phase_info: {
				code_line_offset: 0,
				code_line: [25],
				pass_number: pass_number_to_set,
				io_operations: 0,
				description: function () {
					return "<b>Pass 0</b> of the " + algorithm_type_string_map[selected_algorithm_type] + " algorithm is complete (created <b>" + last_created_run_number + "</b> runs): starting <b>pass 1</b>.";
				}
			},
			rollback: function (animate = false) {
				// Does nothing now...

				// Hide new runs container
				hide_runs((animate ? undefined : 0), true);
				// For each record, snap it to its runs container position (along with its grayed copy)
				let actual_num_of_pages_of_file = $("#runs-container .block").length;
				let pos_x = $("#runs-container .block").offset().left;
				snap_all_records_to_horizontal_position(pos_x, actual_num_of_pages_of_file);

				// Delete grayed copies of records in the #runs-container (may not be needed, but just in case)
				delete_records_grayed_copies("#runs-container");

				// Remove any frame-run association numbers from frames of the buffer
				update_frames_run_number_associations();
			},
			duration: function () {
				return normal_delay() + pause_in_between_animation_phases
			},
		});

		all_records = final_written_records.slice();
		if (LOG_DEBUG) console.log("°°°°°°°°°° ALL RECORDS (after pass 0 of replacement_selection) °°°°°°°°°°");
		if (LOG_DEBUG) console.log(all_records);

	}

	// Pass 0 -----------------------------------------------------------------------------------------------------------------------
	// Move to each page to initial frame, then add phase to sort objects, then move back to sorted runs
	if (selected_algorithm_type == algorithm_type.two_way) {
		// Build animations for the 2-way algorithm
		build_2_way_pass_0();
	} else if (selected_algorithm_type == algorithm_type.k_way) {
		// Build animations for the k-way algorithm
		build_k_way_pass_0();
	} else if (selected_algorithm_type == algorithm_type.replacement_selection) {
		// Replacement selection algorithm
		build_replacement_selection_pass_0();
	}

	let pass_counter = 0;

	function build_i_passes() {

		// Pass i -----------------------------------------------------------------------------------------------------------------------
		let immediate_termination_condition = false;
		immediate_termination_condition ||= (selected_algorithm_type == algorithm_type.two_way && num_of_pages_of_file == 1);
		immediate_termination_condition ||= (selected_algorithm_type == algorithm_type.k_way && num_of_pages_of_file <= num_of_frames_in_buffer);
		immediate_termination_condition ||= (selected_algorithm_type == algorithm_type.replacement_selection && created_runs_records.length == 1);

		if (num_of_pages_of_file >= 1 && !immediate_termination_condition) {
			// Move each run to frames of buffer, i.e. move M-1 runs to frames of buffer (where M is number of available frames)

			// Build the created runs record for the two way and k-way algorithms (since for them the created_runs_records list is empty at the start of the algorithm)
			if (created_runs_records.length == 0) {
				let num_of_runs_at_start = 0;
				let num_of_pages_of_each_run_at_start = 0;
				if (selected_algorithm_type == algorithm_type.two_way) {
					num_of_runs_at_start = num_of_pages_of_file;
					num_of_pages_of_each_run_at_start = 1;
				} else if (selected_algorithm_type == algorithm_type.k_way) {
					num_of_runs_at_start = Math.ceil(num_of_pages_of_file / num_of_frames_in_buffer);
					num_of_pages_of_each_run_at_start = num_of_frames_in_buffer;
				}


				for (let i = 0; i < num_of_runs_at_start; i++) {
					if (i < num_of_runs_at_start - 1) created_runs_records.push(num_of_pages_of_each_run_at_start * num_of_records_per_page);
					else created_runs_records.push((num_of_records_of_file - 1) % (num_of_pages_of_each_run_at_start * num_of_records_per_page) + 1);
				}
			}

			// NOTE: Maintained by the animation functions (populated by the actual start function of the phase itself)
			let output_frame_records = [
				// {
				// 	record_page_number: ?,
				// 	record_number: ?,
				// 	frame_number: ?,
				// 	value: ?,
				//}
			];
			let actual_num_of_records_in_output_frame = 0;

			// let actual_pointed_records = [];

			// Iterating over passes (pass is "pass_i")
			for (let pass_i = 1; pass_i <= (max_num_of_needed_passes - 1) && created_runs_records.length != 1; pass_i++) {

				let pass_number_to_set = pass_i;

				pass_counter += 1;

				// Records written in the runs container at the end of this pass
				let final_written_records = [
					// {
					// 	value: 0,
					// 	page_in_file: 0,
					// 	number_in_page_of_file: 0,
					// }
				];

				let new_run_page_number = 1;

				// Iterating over passes (pass is "pass_i")

				// Set to be an array of elements representing each page of the runs (flattened), with each element being the number of records of the page
				let pages_of_each_run_at_start = [];
				let temp_list = [];
				for (let i = 0; i < created_runs_records.length; i++) {
					let pages_of_this_run = Math.ceil(created_runs_records[i] / num_of_records_per_page);
					for (let j = 0; j < pages_of_this_run; j++) {
						if (j < pages_of_this_run - 1) temp_list.push(num_of_records_per_page);
						else temp_list.push((created_runs_records[i] - 1) % num_of_records_per_page + 1);
					}
					// Push the temp_list as an actual list to the pages_of_each_run_at_start list
					pages_of_each_run_at_start.push(temp_list);
					temp_list = [];
				}

				// Build this array to be similar to the one above, but with runs being the runs that will be produced after merging "num_of_available_frames" runs, hence each element is the number of records of the page of the run
				let pages_of_each_run_at_end = [];
				for (let i = 0; i < created_runs_records.length; i += num_of_available_frames) {
					let final_records_of_this_end_run = 0;
					for (let j = 0; j < num_of_available_frames; j++) {
						if (i + j < created_runs_records.length) {
							final_records_of_this_end_run += created_runs_records[i + j];
						}
					}
					let needed_pages_to_store_this_run = Math.ceil(final_records_of_this_end_run / num_of_records_per_page);
					// Create the runs pages list (i.e. list of number of records for each run)
					for (let j = 0; j < needed_pages_to_store_this_run; j++) {
						if (j < needed_pages_to_store_this_run - 1) temp_list.push(num_of_records_per_page);
						else temp_list.push((final_records_of_this_end_run - 1) % num_of_records_per_page + 1);
					}
					// Push the temp_list as an actual list to the pages_of_each_run_at_start list
					pages_of_each_run_at_end.push(temp_list);
					temp_list = [];
				}

				let actual_num_of_pages_of_file = pages_of_each_run_at_start.flat().length;

				function get_run_number_and_run_page_number_from_page_number(file_page_number, use_end_runs = false) {
					let file_page_number_counter = 0;
					let run_number = 0;
					let run_page_number = 0;
					let pages_of_each_run = (use_end_runs ? pages_of_each_run_at_end : pages_of_each_run_at_start);
					for (let i = 0; i < pages_of_each_run.length; i++) {
						for (let j = 0; j < pages_of_each_run[i].length; j++) {
							file_page_number_counter += 1;
							if (file_page_number_counter == file_page_number) {
								run_number = i + 1;
								run_page_number = j + 1;
								return [run_number, run_page_number];
							}
						}
					}
					return [run_number, run_page_number];
				}

				function get_page_number_from_run_number_and_run_page_number(run_number, run_page_number, use_end_runs = false) {
					let file_page_number = 0;
					for (let i = 0; i < run_number - 1; i++) {
						if (use_end_runs) file_page_number += pages_of_each_run_at_end[i].length;
						else file_page_number += pages_of_each_run_at_start[i].length;
					}
					file_page_number += run_page_number;
					return file_page_number;
				}

				pass_number_to_set = pass_i;

				/**
				 * @description List of objects having attributes:
				 *
				 * ```
				 * {
				 *  record_page_number: 0,
				 *  record_number: 0,
				 *  frame_number: 0,
				 *  value: 0,
				 * }
				 * ```
				 */
				let actual_pointed_records = [];

				let records_runs_grayed_copies_container_html_content_for_this_pass = "";

				let created_runs_records_at_start_of_this_pass = [];
				created_runs_records.forEach(num_of_records => {
					created_runs_records_at_start_of_this_pass.push(num_of_records);
				});

				// Show new runs container (and moves & then snaps records to the run pages n which they are since showing the run moves them) ----------------------------------------------------------------------------------------------------
				animation.push({
					play: function (animate = true) {

						if (LOG_DEBUG) console.log(">>>> Pass " + pass_i + ") Num of runs at end of pass " + pass_i + ": " + pages_of_each_run_at_end.length + " (" + pages_of_each_run_at_end[0].length + " pages each)");

						// Reset all runs to the actual original number of pages and runs for each run at start
						for (let i = 0; i < pages_of_each_run_at_start.length; i++) {
							// Recreate pages of each run as they were at the start of the pass
							// "pages_of_each_run_at_start" may for example have the structure:  [[5,5,2], [5,2], [3], [5,3]]  (i.e. 4 runs)
							let this_run_number = i + 1;
							let num_of_pages_of_this_run = pages_of_each_run_at_start[i].length;
							set_single_run(this_run_number, num_of_pages_of_this_run);
							show_single_run(this_run_number, 0, (animate ? undefined : 0));
						}

						// Show new runs container
						scroll_to_focused_element(get_file_page(1));

						// "Show" new runs container (i.e. makes space for it)
						show_runs((animate ? STEP_DURATION * 0.90 : 0), true);

						// Move each record by a certain amount left
						for (i = 0; i < actual_num_of_pages_of_file; i++) {
							let page_number = i + 1;
							for (j = 0; j < num_of_records_per_page; j++) {
								let record_number = j + 1;
								if (get_record(page_number, record_number) != null) {
									// NOTE: should add up to: 49.5
									let adjustment_factor = 1.5;
									move_record_by_pixels(page_number, record_number, adjustment_factor * ($("#secondary-storage-container .content").width() / 521.625) + (49.5 - adjustment_factor)), 0, 0, (animate ? STEP_DURATION * 0.90 : 0);
								}
							}
						}

						setTimeout(() => {
							// Snap each record to the run page
							for (i = 0; i < actual_num_of_pages_of_file; i++) {
								let page_number = i + 1;
								for (j = 0; j < num_of_records_per_page; j++) {
									let record_number = j + 1;
									if (get_record(page_number, record_number) != null) {
										// Snap record to the run page
										let run_number = get_run_number_and_run_page_number_from_page_number(page_number)[0];
										let run_page_number = get_run_number_and_run_page_number_from_page_number(page_number)[1];
										let delta = $(get_run_page(run_number, run_page_number)).offset().left - $(get_record(page_number, record_number)).offset().left;
										move_record_by_pixels(page_number, record_number, delta, 0, 0, 0);


										// Create grayed copy of records in the runs container
										setTimeout(() => {
											create_single_record_grayed_copy(get_record(page_number, record_number), "#runs-container");
										}, STEP_DURATION * 0.3);
									}
								}
							}

						}, (animate ? STEP_DURATION * 0.90 : 0) + STEP_DURATION * 0.3);

					},
					phase_info: {
						code_line_offset: highlight_lines_offset,
						code_line: [7, 8],
						pass_number: pass_number_to_set,
						io_operations: 0,
						description: function () {
							let append_string = "";
							if (selected_algorithm_type == algorithm_type.replacement_selection && pass_i == 1) {
								append_string = " (note that the layout of the buffer changed for visualization purposes, but the buffer still has <b>" + num_of_frames_in_buffer + "</b> frames)";
							}
							return "Starting <b>pass i=" + pass_i + "</b> of the <b>" + algorithm_type_string_map[selected_algorithm_type] + "</b> algorithm" + append_string + ".";
						}
					},
					rollback: function (animate = false) {
						// Show runs
						show_runs((animate ? undefined : 0), true);

						// Undo next phase (undo move of first run of first group of runs to the first frame, i.e. R1-P1 to F1)
						move_page_to_run(1, 1, 1, 0, (animate ? undefined : 0));
					},
					duration: function () {
						return normal_delay() * 1.75 + pause_in_between_animation_phases
					},
				});

				let all_records_list_at_start_of_this_pass = [];
				all_records.forEach(record => {
					all_records_list_at_start_of_this_pass.push({ ...record });
				});

				// Build sorting tree of pass 0
				if (pass_i == 1) {
					build_single_tree_pass(0, all_records_list_at_start_of_this_pass, pages_of_each_run_at_start);
				}

				// Iterate over runs (consider a group of M-1 runs at each iteration, then consider each of its records)
				let num_of_groups_of_m_minus_1_runs_for_this_pass = Math.ceil(pages_of_each_run_at_start.length / num_of_available_frames); 	// integer from 1 to ...
				for (let group_of_runs_index = 0; group_of_runs_index < num_of_groups_of_m_minus_1_runs_for_this_pass; group_of_runs_index++) {
					// Considering a group of (M-1) runs (where M is the number of total frames)

					let runs_numbers = []; // the numbers of the "num_of_available_frames" (i.e. m-1) we are considering for this group (e.g. [3,4,5] for 4 buffer frames while considering runs 3, 4 and 5)
					for (let run_number = group_of_runs_index * num_of_available_frames + 1; run_number <= pages_of_each_run_at_start.length && run_number <= (group_of_runs_index + 1) * num_of_available_frames; run_number++) {
						runs_numbers.push(run_number);
					}

					runs_numbers.forEach(run_number => {
						let page_number = get_page_number_from_run_number_and_run_page_number(run_number, 1); // Page number in the file
						let frame_number = (run_number - 1) % num_of_available_frames + 1;
						if (page_number <= actual_num_of_pages_of_file) {
							// Move first page of each run to the first frame ===============================================================================
							animation.push({
								play: function (animate = true) {

									// Remove the "pointed" class from each record
									$("#file .record").removeClass("pointed");

									if (run_number == 1 && page_number == 1) {
										// Snap grayed records in their position (to avoid visual errors)
										let pos_x = $("#runs-container .block").offset().left;
										snap_all_record_grayed_copies_to_horizontal_position(pos_x, "#runs-container");
										// Also snap normal file records in their position (to avoid visual errors)
										snap_all_records_to_horizontal_position(pos_x, actual_num_of_pages_of_file);

										// Store a copy of the html content of the runs container copies container (to be used later, in the rollback function of the last iteration in last phase of this pass)
										records_runs_grayed_copies_container_html_content_for_this_pass = $("#runs-container #copies-container").html();

									}
									if (page_number == 1) {
										// Set page of new runs
										set_single_run(run_number, pages_of_each_run_at_end[run_number - 1].length, true);
									}
									// If this is the first run of the runs_numbers list
									if (run_number == runs_numbers[0]) {
										// Set the frame-run number associations of the various buffer frames 
										let runs_being_considered = runs_numbers.slice();
										update_frames_run_number_associations(runs_being_considered);
									}

									if (animate) {
										scroll_to_focused_element(get_file_page(page_number, frame_number, false), STEP_DURATION * 0.8);
									}
									// Move the next page to the frame (with a delay to allow to scroll until the page before loading it)
									move_page_to_frame(page_number, frame_number, normal_delay(), (animate ? undefined : 0));
								},
								phase_info: {
									code_line_offset: highlight_lines_offset,
									code_line: [9, 10],
									pass_number: pass_number_to_set,
									io_operations: 1,
									description: function () {
										if (pages_of_each_run_at_start.length < num_of_available_frames) {
											// There are less runs remaining than the available frames in the buffer
											return "Loading the first " + ((pages_of_each_run_at_start[run_number - 1].length == 1) ? "(and only)" : "") + " page of the <b>" + pages_of_each_run_at_start.length + "</b> runs <b>R" + runs_numbers.join("</b>, <b>R") + "</b> (created at <b>pass i-1=" + (pass_i - 1) + "</b>) to <b>" + pages_of_each_run_at_start.length + "</b> frames of the buffer.";
										} else {
											// There are more runs than available frames in the buffer
											return "Loading the first " + ((pages_of_each_run_at_start[run_number - 1].length == 1) ? "(and only)" : "") + " page of the <b>M-1=" + num_of_available_frames + "</b> runs <b>R" + runs_numbers.join("</b>, <b>R") + "</b> (created at <b>pass i-1=" + (pass_i - 1) + "</b>) to <b>M-1=" + num_of_available_frames + "</b> frames of the buffer.";
										}
									}
								},
								rollback: function (animate = false) {

									// Remove the "pointed" class from each record
									$("#file .record").removeClass("pointed");

									// Undo next phase (undo move of next page of group to next frame)
									if (frame_number < num_of_available_frames) {


										// Undo move of next page of group
										let next_page_number = get_page_number_from_run_number_and_run_page_number(run_number + 1, 1); // Page number in the file
										move_page_to_run(next_page_number, run_number + 1, 1, 0, (animate ? undefined : 0));

									} else {


										// This is the (first) page ot the last run of the group, undo next actual phase
										// 	i.e. undo add class "pointed" to 1st records of each page
										runs_numbers.forEach((run_number) => {
											let page_number = get_page_number_from_run_number_and_run_page_number(run_number, 1); // Page number in the file
											get_record(page_number, 1).removeClass("pointed");
										});
									}

									// Redo previous phase (move first run of first group of runs to the first frame, i.e. R1-P1 to F1)
									if (run_number == 1 && page_number == 1) {
										// Snap normal file records & grayed records in their position (to avoid visual errors)
										let pos_x = $("#runs-container .block").offset().left;
										snap_all_record_grayed_copies_to_horizontal_position(pos_x, "#runs-container");
									}
									if (page_number == 1) {
										// Set page of new runs
										set_single_run(run_number, pages_of_each_run_at_end[run_number - 1].length, true);
									}
									// Move the next page to the frame (with a delay to allow to scroll until the page before loading it)
									move_page_to_frame(page_number, frame_number, 0, (animate ? undefined : 0));

								},
								duration: function () {
									return normal_delay() * 2 + pause_in_between_animation_phases
								},
							});
						}
					});

					// Set the "actual_pointed_records" list (first records of each page)
					runs_numbers.forEach((run_number, index) => {
						let page_number = get_page_number_from_run_number_and_run_page_number(run_number, 1); // Page number in the file
						let total_record_number_in_file = (page_number - 1) * num_of_records_per_page + 1;	// NOTE: list of all records may contain fake records for page padding, hence this is not the real total record number in file, is the total record slot
						let value = -1;
						if (total_record_number_in_file - 1 < all_records.length) value = all_records[total_record_number_in_file - 1].value;
						if (value == -1) value = Number.MAX_SAFE_INTEGER;	// Set it like this to avoid problems with the min function
						actual_pointed_records[index] = {
							record_page_number: page_number,
							record_number: 1,
							frame_number: index + 1,
							value: value,
						}
					});

					let actual_pointed_records_for_this_runs_group = actual_pointed_records.slice();
					let actual_pointed_records_for_this_runs_group_copy = [];
					actual_pointed_records.forEach((record) => {
						actual_pointed_records_for_this_runs_group_copy.push({ ...record });
					});

					// Highlight first record of each page as pointed record ===============================================================================
					animation.push({
						play: function (animate = true) {
							runs_numbers.forEach((run_number, index) => {
								if (LOG_DEBUG) console.log("\t Pass " + pass_i + ") Moved first page of runs [" + runs_numbers.join(", ") + "] in frame for this group");

								// Hightlight pointed records
								let page_number = get_page_number_from_run_number_and_run_page_number(run_number, 1); // Page number in the file
								get_record(page_number, 1).addClass("pointed");

							});
						},
						phase_info: {
							code_line_offset: highlight_lines_offset,
							code_line: [11],
							pass_number: pass_number_to_set,
							io_operations: 0,
							description: function () {
								return "Set each frame's pointer to point to its first record.";
							}
						},
						rollback: function (animate = false) {
							runs_numbers.forEach((run_number, index) => {
								// Hightlight pointed records

								let page_number = get_page_number_from_run_number_and_run_page_number(run_number, 1); // Page number in the file
								get_record(page_number, 1).addClass("pointed");

								// Undo next phase: undo move of min record among pointed records (hence first records) of certain frame to output frame, and add class "pointed" back
								let actual_first_min_record_object = {
									...actual_pointed_records_for_this_runs_group_copy.reduce((previous, current) => {
										return current.value < previous.value ? current : previous;
									})
								};
								move_record_to_new_slot_in_another_frame(actual_first_min_record_object.record_page_number, actual_first_min_record_object.record_number,
									actual_first_min_record_object.frame_number, 1, 0, (animate ? undefined : 0));
								get_record(actual_first_min_record_object.record_page_number, actual_first_min_record_object.record_number).addClass("pointed");

							});
						},
						duration: function () {
							return in_buffer_normal_delay() + pause_in_between_animation_phases
						},
					});
					// Move various records (min records) to the output frame ------------------------------------------------------------------------------------
					let total_records_in_this_runs_group = 0;
					runs_numbers.forEach(run_number => {
						for (let run_page_number = 1; run_page_number <= pages_of_each_run_at_start[run_number - 1].length; run_page_number++) {
							total_records_in_this_runs_group += pages_of_each_run_at_start[run_number - 1][run_page_number - 1];
						}
					});

					for (let i = 0; i < total_records_in_this_runs_group; i++) {

						// NOTE: i is an index representing all records currently in the group of "num_of_available_frames" runs (i.e. M-1 runs) we are considering (from 0 to the max number of records in the group)

						// This should be calculated by taking into account various factors, like the number of runs, the number of pages of each run, ecc...
						// Total record number in pages of file
						let actual_total_record_number = 0;
						for (let run_number = 1; run_number <= pages_of_each_run_at_start.length; run_number++) {
							if (run_number >= runs_numbers[0]) break;
							for (let run_page_number = 1; run_page_number <= pages_of_each_run_at_start[run_number - 1].length; run_page_number++) {
								actual_total_record_number += pages_of_each_run_at_start[run_number - 1][run_page_number - 1];
							}
						}
						actual_total_record_number += i + 1;

						let actual_total_record_page_in_file = 0;
						let sum_of_records = 0;
						for (let run_number = 1; run_number <= pages_of_each_run_at_start.length; run_number++) {
							for (let run_page_number = 1; run_page_number <= pages_of_each_run_at_start[run_number - 1].length; run_page_number++) {
								sum_of_records += pages_of_each_run_at_start[run_number - 1][run_page_number - 1];
								if (sum_of_records >= actual_total_record_number) {
									actual_total_record_page_in_file = get_page_number_from_run_number_and_run_page_number(run_number, run_page_number);
									break;
								}
							}
							if (sum_of_records >= actual_total_record_number) break;
						}
						let actual_total_record_page_in_file_for_end = 0;
						let sum_of_records_for_end = 0;
						for (let run_number = 1; run_number <= pages_of_each_run_at_end.length; run_number++) {
							for (let run_page_number = 1; run_page_number <= pages_of_each_run_at_end[run_number - 1].length; run_page_number++) {
								sum_of_records_for_end += pages_of_each_run_at_end[run_number - 1][run_page_number - 1];
								if (sum_of_records_for_end >= actual_total_record_number) {
									actual_total_record_page_in_file_for_end = get_page_number_from_run_number_and_run_page_number(run_number, run_page_number, true);
									break;
								}
							}
							if (sum_of_records_for_end >= actual_total_record_number) break;
						}

						if (actual_total_record_number <= num_of_records_of_file) {

							// Last record of last run not yet reached

							actual_num_of_records_in_output_frame += 1;

							// Find record with min value among pointed records in "actual_pointed_records" list
							let sorted_actual_pointed_records_list = actual_pointed_records_for_this_runs_group.slice();
							sorted_actual_pointed_records_list.sort((a, b) => (a.value > b.value) ? 1 : -1);
							let min_record_object = { ...sorted_actual_pointed_records_list[0] };
							let next_pointed_record_object = null;

							// Update the actual pointed records list to point to the next record of its page
							let min_value_index = min_record_object.frame_number - 1;

							let pointed_record_was_last_of_its_frame = min_record_object.record_number >= num_of_records_per_page;

							let min_record_run_number = get_run_number_and_run_page_number_from_page_number(min_record_object.record_page_number)[0];
							let min_record_run_page_number = get_run_number_and_run_page_number_from_page_number(min_record_object.record_page_number)[1];
							let should_load_next_page_of_run_containing_pointed_min_record = true &&
								pointed_record_was_last_of_its_frame &&
								min_record_run_page_number < pages_of_each_run_at_start[min_record_run_number - 1].length &&	// min record's run page number is less than the number of pages of the run (hence there still is a run page to consider)
								min_record_object.record_page_number + 1 <= actual_num_of_pages_of_file;

							if (!pointed_record_was_last_of_its_frame) {
								// There is another record to point after this one in its corresponding slot

								let total_record_number_in_file = (min_record_object.record_page_number - 1) * num_of_records_per_page + min_record_object.record_number + 1;

								let new_value = -1;
								if (total_record_number_in_file - 1 < all_records.length) new_value = all_records[total_record_number_in_file - 1].value;
								if (new_value == -1) new_value = Number.MAX_SAFE_INTEGER;	// Set it like this to avoid problems with the min function

								actual_pointed_records[min_value_index].record_number += 1;
								actual_pointed_records[min_value_index].value = new_value;

								next_pointed_record_object = {
									record_page_number: min_record_object.record_page_number,
									record_number: min_record_object.record_number + 1,
									frame_number: min_record_object.frame_number,
									value: new_value
								};

							} else {
								// The pointed min record was the last of its page / frame (if we can, load the next page, otherwise set its value to MAX_SAFE_INTEGER)

								if (should_load_next_page_of_run_containing_pointed_min_record) {
									// "Load" next page of run containing pointed min record and set the pointed record of the corresponding frame to the first of this page

									let new_page_number = min_record_object.record_page_number + 1;

									let total_record_number_in_file = (new_page_number - 1) * num_of_records_per_page + 1;

									let new_value = -1;
									if (total_record_number_in_file - 1 < all_records.length) new_value = all_records[total_record_number_in_file - 1].value;
									if (new_value == -1) new_value = Number.MAX_SAFE_INTEGER;	// Set it like this to avoid problems with the min function

									// // Update pointed record to be the next record of the newly loaded page (first record of the frame now)
									actual_pointed_records[min_value_index].record_page_number = new_page_number;
									actual_pointed_records[min_value_index].record_number = 1;
									actual_pointed_records[min_value_index].value = new_value;

									next_pointed_record_object = {
										record_page_number: new_page_number,
										record_number: 1,
										frame_number: min_record_object.frame_number,
										value: new_value
									};

								} else {
									// There is no next page to load for the run containing the pointed min record, hence set its value to MAX_SAFE_INTEGER (so that it will be ignored in the next min function)

									actual_pointed_records[min_value_index].record_number = num_of_records_per_page + 1;
									actual_pointed_records[min_value_index].value = Number.MAX_SAFE_INTEGER;
								}
							}

							let actual_pointed_records_for_next_iteration = [];
							actual_pointed_records.forEach((record) => {
								actual_pointed_records_for_next_iteration.push({ ...record });
							});

							let output_frame_slot_number = output_frame_records.length + 1;

							output_frame_records.push(min_record_object);

							let should_empty_output_frame = actual_num_of_records_in_output_frame == num_of_records_per_page;

							let actually_empty_output_frame = should_empty_output_frame ||	// Output frame is actually full
								actual_total_record_number == num_of_records_of_file ||			// Last record of very last run reached
								i + 1 == total_records_in_this_runs_group;						// Last record in this group of runs reached

							let output_frame_records_copy = output_frame_records.slice();

							function undo_current_min_record_operations_phases(animate = false, skip_first = false, skip_second = false, skip_third = false) {


								if (!skip_first && pointed_record_was_last_of_its_frame && should_load_next_page_of_run_containing_pointed_min_record) {
									// Undo move of next page of min record run to the min record frame (and remove "pointed" from the first record of that page)
									// move_page_to_frame(min_record_object.record_page_number + 1, min_record_object.frame_number, 0, (animate ? undefined : 0));
									let run_number = min_record_run_number;
									let page_of_run = min_record_run_page_number + 1;
									move_page_to_run(min_record_object.record_page_number + 1, run_number, page_of_run, 0, (animate ? undefined : 0));

									let actual_next_pointed_record = get_record(next_pointed_record_object.record_page_number, next_pointed_record_object.record_number);
									$(actual_next_pointed_record).removeClass("pointed");

								} else if (!skip_first && !pointed_record_was_last_of_its_frame) {

									// Remove "pointed" class from next record
									let actual_next_pointed_record = get_record(next_pointed_record_object.record_page_number, next_pointed_record_object.record_number);
									$(actual_next_pointed_record).removeClass("pointed");

								} else {

									if (!skip_third && actually_empty_output_frame) {
										// Updo emptying of output frame
										let new_run_number = get_run_number_and_run_page_number_from_page_number(actual_total_record_page_in_file_for_end, true)[0];
										let page_of_new_run = get_run_number_and_run_page_number_from_page_number(actual_total_record_page_in_file_for_end, true)[1];

										if (!skip_second && page_of_new_run == 1) {
											// Undo showing (and setting?) of new run
											hide_single_run(new_run_number, 0, (animate ? undefined : 0), true);
										} else {
											// Undo move of records of the output frame to the page
											for (let i = 0; i < output_frame_records_copy.length; i++) {
												// move all the records in the output frame back to the output frame
												let record_object = output_frame_records_copy[i];
												// move_record_to_run(record_object.record_page_number, record_object.record_number, new_run_number, page_of_new_run, 0, (animate ? undefined : 0), true, i + 1);
												move_record_to_new_slot_in_another_frame(record_object.record_page_number, record_object.record_number, num_of_frames_in_buffer, i + 1, 0, (animate ? undefined : 0));
											}
										}
									} else {
										// Undo start of "for" loop for the next record to consider
										//	hence undo move next min r in otuput buffer and also undo remove class "pointed" to next min record (thus add the class to actually undo)
										let record_number_in_this_runs_group = i + 1;
										if (record_number_in_this_runs_group < total_records_in_this_runs_group) {
											let min_record_object_for_next_iteration = {
												...actual_pointed_records_for_next_iteration.reduce((previous, current) => {
													return current.value < previous.value ? current : previous;
												})
											};
											let next_min_record_slot_number_in_frame = min_record_object_for_next_iteration.record_number;
											move_record_to_new_slot_in_another_frame(min_record_object_for_next_iteration.record_page_number, min_record_object_for_next_iteration.record_number,
												min_record_object_for_next_iteration.frame_number, next_min_record_slot_number_in_frame, 0, (animate ? undefined : 0));
											get_record(min_record_object_for_next_iteration.record_page_number, min_record_object_for_next_iteration.record_number).addClass("pointed");
										} else {
											// This is the last record of this iteration (for this runs group)
											if (actual_total_record_number < num_of_records_of_file) {
												// Undo next runs group start phase

												let next_iteration_first_run_number = runs_numbers[runs_numbers.length - 1] + 1;
												let next_iteration_first_run_page_number = 1;
												let next_iteration_first_file_page = get_page_number_from_run_number_and_run_page_number(next_iteration_first_run_number, next_iteration_first_run_page_number);
												if (get_run_page(next_iteration_first_run_number, next_iteration_first_run_page_number) == null) {
													set_single_run(next_iteration_first_run_number, next_iteration_first_run_page_number, 0, (animate ? undefined : 0), true);
												}
												move_page_to_run(next_iteration_first_file_page, next_iteration_first_run_number, next_iteration_first_run_page_number, 0, (animate ? undefined : 0));
											} else {
												// This was the last group of runs (pass is over), undo next phase (last phase of this pass)

												for (let i = 0; i < pages_of_each_run_at_end.length; i++) {
													// Recreate pages of each run as they were at the start of the pass
													// "pages_of_each_run_at_start" may for example have the structure:  [[5,5,2], [5,2], [3], [5,3]]  (i.e. 4 runs)
													let this_run_number = i + 1;
													let num_of_pages_of_this_run = pages_of_each_run_at_end[i].length;
													set_single_run(this_run_number, num_of_pages_of_this_run, true);
													show_single_run(this_run_number, 0, (animate ? undefined : 0), true);
												}

												for (let i = 0; i < pages_of_each_run_at_start.length; i++) {
													// Recreate pages of each run as they were at the start of the pass
													// "pages_of_each_run_at_start" may for example have the structure:  [[5,5,2], [5,2], [3], [5,3]]  (i.e. 4 runs)
													let this_run_number = i + 1;
													let num_of_pages_of_this_run = pages_of_each_run_at_start[i].length;
													set_single_run(this_run_number, num_of_pages_of_this_run);
													show_single_run(this_run_number, 0, (animate ? undefined : 0));
												}

												// Runs container content should be restored from the records grayed copies container stored html content
												let grayed_copies_container = $("#runs-container #copies-container");
												if (grayed_copies_container.length == 0) {
													$("#runs-container").append("<div id='copies-container'></div>");
													grayed_copies_container = $("#runs-container #copies-container");
												}
												grayed_copies_container.html(records_runs_grayed_copies_container_html_content_for_this_pass);
												show_runs(0, false);
												show_runs(0, true);

												let list_of_runs_tops = [];
												let runs = $("#runs-container-next .block");
												for (let i = 0; i < actual_num_of_pages_of_file; i++) {
													let page_number = i + 1;
													let page = get_file_page(page_number);
													if (page != null) {
														list_of_runs_tops.push($(runs[i]).offset().top - page.offset().top);
													} else {
													}
												}

												reparent_all_records_based_on_given_list(all_records_list_at_start_of_this_pass, list_of_runs_tops, runs_created_at_end_of_this_pass);

												// Should then reorder records based on the order of the "all_records_list_at_end_of_this_pass" list

												for (let i = 0; i < all_records_list_at_end_of_this_pass.length; i++) {
													let record_object = all_records_list_at_end_of_this_pass[i];

													if (record_object.value == -1) continue;

													let corresponding_record_object_of_end_record_object = { ...all_records_list_at_start_of_this_pass.find((record) => record.value == record_object.value) };

													let corresponding_run_number = get_run_number_and_run_page_number_from_page_number(record_object.page_in_file, true)[0];
													let corresponding_run_page_number = get_run_number_and_run_page_number_from_page_number(record_object.page_in_file, true)[1];
													let slot_position = i % num_of_records_per_page + 1;
													move_record_to_run(
														corresponding_record_object_of_end_record_object.page_in_file,
														corresponding_record_object_of_end_record_object.number_in_page_of_file,
														corresponding_run_number,
														corresponding_run_page_number,
														0, 0, true, slot_position
													);

												}

												// Snaps record to the runs container next position
												let pos_x = $("#runs-container-next .block").offset().left;
												snap_all_records_to_horizontal_position(pos_x, actual_num_of_pages_of_file);

											}
										}
									}
								}
							}

							// Find record with minimum value among pointed and move it to the output frame (last buffer) ========================================
							animation.push({
								play: function (animate = true) {

									let actual_min_record = get_record(min_record_object.record_page_number, min_record_object.record_number);
									$(actual_min_record).removeClass("pointed");

									scroll_to_focused_element(get_frame(1));

									if (LOG_DEBUG) console.log("> Actual total record number: " + actual_total_record_number + " (page " + actual_total_record_page_in_file + ") | Min record: " + min_record_object.value + " (page " + min_record_object.record_page_number + ")");

									move_record_to_new_slot_in_another_frame(min_record_object.record_page_number, min_record_object.record_number, -1, output_frame_slot_number, 0, (animate ? in_buffer_normal_delay() : 0));
								},
								phase_info: {
									code_line_offset: highlight_lines_offset,
									code_line: [13, 14],
									pass_number: pass_number_to_set,
									io_operations: 0,
									description: function () {

										let actual_min_record = get_record(min_record_object.record_page_number, min_record_object.record_number);

										let append_string = "";
										if (pointed_record_was_last_of_its_frame && !should_load_next_page_of_run_containing_pointed_min_record) append_string = " (<b>r</b> was the last record of its frame, but its associated run <b>R" + min_record_run_number + "</b> has no more pages to load)";

										return "Record with min value among pointed records is " + get_record_description_string(actual_min_record) + " (in frame <b>F" + min_record_object.frame_number + "</b>): moving it to the output frame" + append_string + ".";

									}
								},
								rollback: function (animate = false) {

									// Undo next phase:
									undo_current_min_record_operations_phases(animate);

									// Redo this phase's "play" function
									let actual_min_record = get_record(min_record_object.record_page_number, min_record_object.record_number);
									$(actual_min_record).removeClass("pointed");
									move_record_to_new_slot_in_another_frame(min_record_object.record_page_number, min_record_object.record_number, -1, output_frame_slot_number, 0, (animate ? in_buffer_normal_delay() : 0));

								},
								duration: function () {
									return in_buffer_normal_delay() + pause_in_between_animation_phases
								},
							});


							// The min record was the last of its page (if we can, load the next page, else point to next record of frame) ------------------------------------------------------------------
							if (pointed_record_was_last_of_its_frame) {

								if (should_load_next_page_of_run_containing_pointed_min_record) {
									let run_number = min_record_run_number;
									let page_of_run = min_record_run_page_number + 1;

									// Load next page of the min record's corresponding run and highlight its first record
									animation.push({
										play: function (animate = true) {

											if (LOG_DEBUG) console.log("Trying to load new page (" + (min_record_object.record_page_number + 1) + ") in frame " + min_record_object.frame_number + " (run " + min_record_object.frame_number + ") after reaching last record of this frame");

											// Scroll to page's current position of element, then move page in frame

											if (animate) {
												scroll_to_focused_element(get_run_page(run_number, page_of_run, false), STEP_DURATION * 0.8);
											}

											// Move the next run page to the frame (with a delay to allow to scroll until the page before loading it)
											move_page_to_frame(min_record_object.record_page_number + 1, min_record_object.frame_number, normal_delay(), (animate ? undefined : 0));

											// Hightlight pointed record
											let actual_next_pointed_record = get_record(next_pointed_record_object.record_page_number, next_pointed_record_object.record_number);
											$(actual_next_pointed_record).addClass("pointed");

										},
										phase_info: {
											code_line_offset: highlight_lines_offset,
											code_line: [17, 18, 19],
											pass_number: pass_number_to_set,
											io_operations: 1,
											description: function () {
												let actual_min_record = get_record(min_record_object.record_page_number, min_record_object.record_number);
												return "Minimum record " + get_record_description_string(actual_min_record) + " was the last record of its frame <b>F" + min_record_object.frame_number + "</b> and its associated run <b>R" + run_number + "</b> has more pages: loading the next page <b>P" + page_of_run + "</b> of run <b>R" + run_number + "</b> in frame <b>F" + min_record_object.frame_number + "</b> of the buffer (and pointing to its first record).";
											}
										},
										rollback: function (animate = false) {

											// Undo next phase
											undo_current_min_record_operations_phases(animate, true);

											// Redo this phase's "play" function
											// Move the next run page to the frame (with a delay to allow to scroll until the page before loading it)
											move_page_to_frame(min_record_object.record_page_number + 1, min_record_object.frame_number, 0, (animate ? undefined : 0));
											// Hightlight pointed record
											let actual_next_pointed_record = get_record(next_pointed_record_object.record_page_number, next_pointed_record_object.record_number);
											$(actual_next_pointed_record).addClass("pointed");

											// Set the frame-run number associations of the various buffer frames 
											// NOTE: This might not be needed here, but we do it just in case (since redoing it is not a problem)
											let runs_being_considered = runs_numbers.slice();
											update_frames_run_number_associations(runs_being_considered);

										},
										duration: function () {
											return normal_delay() * 2 + pause_in_between_animation_phases
										},
									});
								}

							} else {

								// Point to the next record (record was NOT the last of its frame)
								animation.push({
									play: function (animate = true) {

										let actual_next_pointed_record = get_record(next_pointed_record_object.record_page_number, next_pointed_record_object.record_number);
										if (actual_next_pointed_record != null) $(actual_next_pointed_record).addClass("pointed");
									},
									phase_info: {
										code_line_offset: highlight_lines_offset,
										code_line: [15, 16],
										pass_number: pass_number_to_set,
										io_operations: 0,
										description: function () {
											// There is actually another record to point to 
											let actual_min_record = get_record(min_record_object.record_page_number, min_record_object.record_number);
											let actual_next_pointed_record = get_record(next_pointed_record_object.record_page_number, next_pointed_record_object.record_number);
											if (actual_next_pointed_record != null) {
												return "Minimum record " + get_record_description_string(actual_min_record) + " was <b>NOT</b> the last record of its frame <b>F" + min_record_object.frame_number + "</b> pointing to next record " + get_record_description_string(actual_next_pointed_record) + ".";
											} else {
												// Record was not last of its frame, but it was indeed the last record of its page
												return "Minimum record " + get_record_description_string(actual_min_record) + " was <b>NOT</b> the last record of its frame <b>F" + min_record_object.frame_number + "</b> but there are no more records to consider for its associated run <b>R" + min_record_run_number + "</b>.";
											}
										}
									},
									rollback: function (animate = false) {

										// Undo next phase
										undo_current_min_record_operations_phases(animate, true);

										// Redo this phase's "play" function
										let actual_next_pointed_record = get_record(next_pointed_record_object.record_page_number, next_pointed_record_object.record_number);
										if (actual_next_pointed_record != null) $(actual_next_pointed_record).addClass("pointed");

										// Set the frame-run number associations of the various buffer frames 
										// NOTE: This might not be needed here, but we do it just in case (since redoing it is not a problem)
										let runs_being_considered = runs_numbers.slice();
										update_frames_run_number_associations(runs_being_considered);

									},
									duration: function () {
										return in_buffer_normal_delay() + pause_in_between_animation_phases
									},
								});

							}

							if (actually_empty_output_frame) {
								// Empty output frame (write to secondary storage) ======================================================================================

								let new_run_number = get_run_number_and_run_page_number_from_page_number(actual_total_record_page_in_file_for_end, true)[0];
								let page_of_new_run = get_run_number_and_run_page_number_from_page_number(actual_total_record_page_in_file_for_end, true)[1];

								// Show new run ------------------------------------------------------------------------------------
								if (page_of_new_run == 1) {
									animation.push({
										play: function (animate = true) {
											// move all the records currenly in the output frame to the new run
											set_single_run(new_run_number, pages_of_each_run_at_end[new_run_number - 1].length, true);
											show_single_run(new_run_number, 0, (animate ? undefined : 0), true);

										},
										phase_info: {
											code_line_offset: highlight_lines_offset,
											code_line: [20, 21],
											pass_number: pass_number_to_set,
											io_operations: 0,
											description: function () {
												return "Output frame is full: creating a new run <b>R" + new_run_number + "</b> (with <b>" + pages_of_each_run_at_end[new_run_number - 1].length + "</b> pages) in secondary storage to store the current records in the output frame.";
											}
										},
										rollback: function (animate = false) {

											// Undo next phase: undo move of records of the output frame to the page
											undo_current_min_record_operations_phases(animate, true, true);

											// Redo this phase's "play" function
											set_single_run(new_run_number, pages_of_each_run_at_end[new_run_number - 1].length, true);
											show_single_run(new_run_number, 0, (animate ? undefined : 0), true);

											// Set the frame-run number associations of the various buffer frames 
											// NOTE: This might not be needed here, but we do it just in case (since redoing it is not a problem)
											let runs_being_considered = runs_numbers.slice();
											update_frames_run_number_associations(runs_being_considered);

										},
										duration: function () {
											return normal_delay() + pause_in_between_animation_phases
										},
									});
								}

								actual_num_of_records_in_output_frame = 0;

								// Add records that are currently in output frame (plus padding if needed) to the final written records list (before emptying the output records list)
								let final_written_records_last_written_page = 0;
								if (final_written_records.length > 0) final_written_records_last_written_page = final_written_records[final_written_records.length - 1].page_in_file;
								for (let i = 0; i < num_of_records_per_page; i++) {
									let record_page_in_file = final_written_records_last_written_page + 1;
									let rec_obj = {
										value: -1,
										page_in_file: record_page_in_file,
										number_in_page_of_file: i + 1
									}
									if (i < output_frame_records_copy.length) {
										rec_obj.value = output_frame_records_copy[i].value;
									}
									final_written_records.push(rec_obj);
								}

								output_frame_records = [];

								// Empty output frame (write it in current run) -----------------------------------------------------------------------------------------------
								animation.push({
									play: function (animate = true) {
										// Scroll to the run

										scroll_to_focused_element(get_run_page(new_run_number, page_of_new_run, true), (animate ? undefined : 0));

										for (let i = 0; i < output_frame_records_copy.length; i++) {
											// move all the records in the output frame to the new run
											let record_object = output_frame_records_copy[i];
											move_record_to_run(record_object.record_page_number, record_object.record_number, new_run_number, page_of_new_run, 0, (animate ? undefined : 0), true, i + 1);
										}
									},
									phase_info: {
										code_line_offset: highlight_lines_offset,
										code_line: [20, 21],
										pass_number: pass_number_to_set,
										io_operations: 1,
										description: function () {
											return "Output frame is full: writing its records in run <b>R" + new_run_number + "</b> (in secondary storage).";
										}
									},
									rollback: function (animate = false) {
										// Undo next phase: Undo start of "for" loop for the next record to consider
										undo_current_min_record_operations_phases(animate, true, true, true);

										// Redo this phase's "play" function
										for (let i = 0; i < output_frame_records_copy.length; i++) {
											// move all the records in the output frame to the new run
											let record_object = output_frame_records_copy[i];
											move_record_to_run(record_object.record_page_number, record_object.record_number, new_run_number, page_of_new_run, 0, (animate ? undefined : 0), true, i + 1);
										}

										// Set the frame-run number associations of the various buffer frames 
										// NOTE: This might not be needed here, but we do it just in case (since redoing it is not a problem)
										let runs_being_considered = runs_numbers.slice();
										update_frames_run_number_associations(runs_being_considered);

									},
									duration: function () {
										return normal_delay() + pause_in_between_animation_phases
									},
								});
								new_run_page_number += 1;
							}
						}
					}
					// Group of runs is over
				}
				// PASS IS OVER: Should be resetting runs (i.e. hiding old runs, swapping old with new runs, then starting the new pass)

				created_runs_records = [];
				for (let run_number = 1; run_number <= pages_of_each_run_at_end.length; run_number++) {
					let total_records_of_this_run = 0;
					for (let page_number = 1; page_number <= pages_of_each_run_at_end[run_number - 1].length; page_number++) {
						total_records_of_this_run += pages_of_each_run_at_end[run_number - 1][page_number - 1];
					}
					created_runs_records.push(total_records_of_this_run);
				}

				let runs_created_at_end_of_this_pass = created_runs_records.slice();
				let num_of_runs_created_at_end_of_this_pass = runs_created_at_end_of_this_pass.length;

				let actual_num_of_pages_of_file_for_end = pages_of_each_run_at_end.flat().length;

				// Hide old runs
				animation.push({
					play: function (animate = true) {

						// Remove the "pointed" class from each record
						$("#file .record").removeClass("pointed");

						delete_records_grayed_copies("#runs-container");

						// Hide runs
						hide_runs((animate ? STEP_DURATION * 0.90 : 0));

						scroll_to_focused_element(get_frame(1), (animate ? STEP_DURATION * 0.90 : 0));

						// Move records to the right (to manually follow the runs container)
						for (i = 0; i < actual_num_of_pages_of_file_for_end; i++) {
							let page_number = i + 1;
							for (j = 0; j < num_of_records_per_page; j++) {
								let record_number = j + 1;
								if (get_record(page_number, record_number) != null) {
									// NOTE: should add up to: 111
									let adjustment_factor = 260.5;
									move_record_by_pixels(page_number, record_number, ($("#secondary-storage-container .content").width() / 521.625) * adjustment_factor + (111 - adjustment_factor), 0, 0, (animate ? STEP_DURATION * 0.90 : 0));
								}
							}
						}

						// Reparent records, swap old with new runs, ecc...
						setTimeout(() => {

							// Reparent records
							let list_of_runs_tops = [];
							let runs = $("#runs-container-next .block");
							for (let i = 0; i < actual_num_of_pages_of_file_for_end; i++) {
								let page_number = i + 1;
								let page = get_file_page(page_number);
								list_of_runs_tops.push($(runs[i]).offset().top - page.offset().top);
							}
							reparent_all_records_based_on_top_position(list_of_runs_tops, runs_created_at_end_of_this_pass);

							// Swap old with new runs
							$("#runs-container").html($("#runs-container-next").html());
							$("#runs-container-next").html("");

							hide_runs(0, true);
							show_runs(0, false);

							setTimeout(() => {
								// Snaps record to the runs container position
								for (i = 0; i < actual_num_of_pages_of_file_for_end; i++) {
									let page_number = i + 1;
									for (j = 0; j < num_of_records_per_page; j++) {
										let record_number = j + 1;
										if (get_record(page_number, record_number) != null) {
											let run_number = get_run_number_and_run_page_number_from_page_number(page_number, true)[0];
											let run_page_number = get_run_number_and_run_page_number_from_page_number(page_number, true)[1];
											let delta = $(get_run_page(run_number, run_page_number)).offset().left - $(get_record(page_number, record_number)).offset().left;
											move_record_by_pixels(page_number, record_number, delta, 0, 0, 0);
										}
									}
								}
							}, STEP_DURATION * 0.3);

						}, (animate ? STEP_DURATION * 0.90 : 0) + STEP_DURATION * 0.3);

					},
					phase_info: {
						code_line_offset: highlight_lines_offset,
						code_line: [22, 23],
						pass_number: pass_number_to_set,
						io_operations: 0,
						description: function () {
							let run_numbers_at_start_of_this_pass = [];
							for (let run_number = 1; run_number <= pages_of_each_run_at_start.length; run_number++) run_numbers_at_start_of_this_pass.push(run_number);
							let run_numbers_at_end_of_this_pass = [];
							for (let run_number = 1; run_number <= pages_of_each_run_at_end.length; run_number++) run_numbers_at_end_of_this_pass.push(run_number);
							let num_of_pages_of_last_run_at_end = (actual_num_of_pages_of_file_for_end - 1) % pages_of_each_run_at_end[0].length + 1;
							let str_1 = "All records of runs <b>R" + run_numbers_at_start_of_this_pass.join("</b>, <b>R") + "</b> of previous pass <b>i-1=" + (pass_i - 1) + "</b> were analyzed. " +
								"Pass <b>i=" + pass_i + "</b> is over: created run" + (run_numbers_at_end_of_this_pass.length == 1 ? "" : "s") + " <b>R" + run_numbers_at_end_of_this_pass.join("</b>, <b>R") + "</b>";
							let str_2 = " of <b>" + pages_of_each_run_at_end[0].length + "</b> page" + (pages_of_each_run_at_end[0].length == 1 ? "" : "s") + " each" +
								((num_of_pages_of_last_run_at_end != pages_of_each_run_at_end[0].length) ? (" (last run <b>R" + pages_of_each_run_at_end.length + "</b> only has <b>" +
									num_of_pages_of_last_run_at_end + "</b> page" + (num_of_pages_of_last_run_at_end == 1 ? "" : "s") + ")") : "");
							if (selected_algorithm_type == algorithm_type.two_way || selected_algorithm_type == algorithm_type.k_way) {
								return str_1 + str_2 + ".";
							} else {
								return str_1 + ".";
							}
						}
					},
					rollback: function (animate = false) {

						// Remove the "pointed" class from each record
						$("#file .record").removeClass("pointed");

						// Undo next phase (start of next pass or even end of algorithm)
						// NOTE: some of the "undoing" was actually made also in the "redo play" lines of code of this rollback function, unsoing and play of original function is mixed)
						if (pass_i <= (max_num_of_needed_passes - 1) && num_of_runs_created_at_end_of_this_pass != 1) {
							// Undo start of next pass
							// Do nothing... (?)
						} else {
							// This is the last pass, undo end of algorithm
							// ...
							$("#runs-container").removeClass("transform-to-file");

							// Reparent all records to the #runs-container
							reparent_all_runs_pages_to_file();

							// NOTE: not sure if these css styles "unsetting" work...
							$("#file").css("overflow", "");

							$("#file").css("width", "");
							$("#file").css("padding-left", "");
							$("#file").css("padding-right", "");

							stop_fireworks();
						}

						// NOTE: This should actually NOT be needed (since records grayed copies are already deleted as we are going back from
						//		a state after this actual state, which deleted the grayed copies in the "play()" function)
						delete_records_grayed_copies("#runs-container");

						// Reset all runs to the actual original number of pages and runs for each run at start
						for (let i = 0; i < pages_of_each_run_at_start.length; i++) {
							// Recreate pages of each run as they were at the start of the pass
							let this_run_number = i + 1;
							let num_of_pages_of_this_run = pages_of_each_run_at_start[i].length;
							set_single_run(this_run_number, num_of_pages_of_this_run);
							show_single_run(this_run_number, 0, (animate ? undefined : 0));
						}

						// Reset new runs container to the actual original number of pages and runs for each run at start
						for (let i = 0; i < pages_of_each_run_at_end.length; i++) {
							// Recreate pages of each run as they were at the start of the pass
							let this_run_number = i + 1;
							let num_of_pages_of_this_run = pages_of_each_run_at_end[i].length;
							set_single_run(this_run_number, num_of_pages_of_this_run, true);
							show_single_run(this_run_number, 0, (animate ? undefined : 0), true);
						}

						// Swap old with new runs
						show_runs(0, true);

						let grayed_copies_container = $("#runs-container #copies-container");
						if (grayed_copies_container.length == 0) {
							$("#runs-container").append("<div id='copies-container'></div>");
							grayed_copies_container = $("#runs-container #copies-container");
						}
						grayed_copies_container.html(records_runs_grayed_copies_container_html_content_for_this_pass);	// This includes grayed copies

						hide_runs(0, false);

						// Snaps record to the runs container position
						let pos_x = $("#runs-container-next .block").offset().left;
						snap_all_records_to_horizontal_position(pos_x, actual_num_of_pages_of_file);


					},
					duration: function () {
						return normal_delay() * 1.85 + pause_in_between_animation_phases
					},
				});

				// Update actual records list ("all_records" list)
				// i.e. copy the final_written_records list into the all_records list
				all_records = final_written_records.slice();
				if (LOG_DEBUG) console.log("°°°°°°°°°° ALL RECORDS (after pass " + pass_i + " of replacement_selection) °°°°°°°°°°");
				if (LOG_DEBUG) console.log(all_records);

				let all_records_list_at_end_of_this_pass = [];
				all_records.forEach(record => {
					all_records_list_at_end_of_this_pass.push({ ...record });
				});

				// Build the "sorting tree" pass i
				build_single_tree_pass(pass_i, all_records_list_at_end_of_this_pass, pages_of_each_run_at_end);

				// END OF THIS PASS (also hid "hold" runs, ecc...) -----------------------------------------------------------------------------------------------------------------------
			}
			// END OF ALL PASSES
		}
	}

	// Build pass i
	build_i_passes();

	let final_total_passes = pass_counter;

	let pass_number_to_set = -2;

	// [Phase (animation.length - 3)] Transform the actual runs container into the file container -------------------------------------------------------------------------
	animation.push({
		play: function (animate = true) {
			// Animates the border of the dashed rectangle to become invisible
			$("#runs-container").addClass("transform-to-file");
			// Reparent all records to the #runs-container
			reparent_all_file_pages_to_runs();
			$("#file").css("overflow", "hidden");
			setTimeout(() => {
				$("#file").animate({
					width: "0px",
					"padding-left": "0px",
					"padding-right": "0px"
				}, (animate ? STEP_DURATION : 0));
			}, 500);

			// Starts fireworks anyway
			let phase_at_start = current_phase;
			setTimeout(() => {
				// If we are stil in this phase (i.e. user was moving with arrows or step forward button and now stopped in this phase), start fireworks
				if (phase_at_start == current_phase) {
					start_fireworks();
				}
			}, 2750);

			// Remove any frame-run association numbers from frames of the buffer
			update_frames_run_number_associations();
		},
		phase_info: {
			code_line_offset: highlight_lines_offset,
			code_line: [8],
			pass_number: pass_number_to_set,
			io_operations: 0,
			description: function () {
				return "No more runs to consider: algorithm is over after <b>" + (final_total_passes - 1) + "</b> passes<br/>(<b>excluding</b> pass 0).";
			}
		},
		rollback: function (animate = false) {
			// ...
		},
		duration: function () {
			return 3000 + pause_in_between_animation_phases
		},
	});
	// [Phase (animation.length - 2)] End of animation --------------------------------------------------------------------------------------------------------------------
	animation.push({
		play: function (animate = true) {
			scroll_to_focused_element($("#file"), (animate ? undefined : 0));
			// Set all records top position to 0
			$("#runs-container .record").css("top", "0px");
			if (LOG_DEBUG) console.log("End of animation");

			// Starts fireworks anyway
			let phase_at_start = current_phase;
			setTimeout(() => {
				// If we are stil in this phase (i.e. user was moving with arrows or step forward button and now stopped in this phase), start fireworks
				if (phase_at_start == current_phase) {
					start_fireworks();
				}
			}, normal_delay() * 1.25);

		},
		phase_info: {
			code_line_offset: highlight_lines_offset,
			code_line: [24],
			pass_number: pass_number_to_set,
			io_operations: 0,
			description: function () {
				set_rainbow_text = false;
				return "<span class=\"final-description-alternate\"><b>File is now sorted!</b></span>";
			}
		},
		rollback: function (animate = false) {
			scroll_to_focused_element($("#file"), (animate ? undefined : 0));
			if (LOG_DEBUG) console.log("End of animation");
			stop_fireworks();
		},
		duration: function () {
			return normal_delay() * 1.5 + pause_in_between_animation_phases
		},
	});
	// [Phase (animation.length - 1)] End of animation ----------------------------------------------------------------------------------------------------------------------
	animation.push({
		play: function (animate = true) {
			start_fireworks();
		},
		phase_info: {
			code_line_offset: highlight_lines_offset,
			code_line: [24],
			pass_number: pass_number_to_set,
			io_operations: 0,
			description: function () {
				return "<span class=\"final-description-alternate\"><b>File is now sorted!</b></span>";
			}
		},
		rollback: function (animate = false) { },
		duration: function () {
			return STEP_DURATION
		},
	});
}
