
/**
 * @definition Moves a record to the frame with the given number. If number is -1, moves the record to the output frame.
 */
function move_record_to_frame(record, frame_number, delay = 0, duration = STEP_DURATION) {

	setTimeout(() => {

		let frame = get_frame(frame_number);

		// Calculate the destination position (frames position) for thee record relative to the parent of the record,
		// i.e. the bloxk containing it, hence use css top and left since the element has position relative
		let current_record_position = $(record).position();
		let delta_position = {
			'left': $(frame).offset().left - $(record).offset().left,
			'top': $(frame).offset().top - $(record).offset().top
		};

		let destination = {
			// set the destination to use in the animate function
			// NOTE: I animate using top and left, so the offset() function might not be appropriate
			'left': current_record_position.left + delta_position.left + 'px',
			'top': current_record_position.top + delta_position.top + 'px'
		};

		// move the record to the frame, with a little animation
		$(record).animate({
			'left': destination.left,
			'top': destination.top
		}, duration, 'linear', function () {
			$(record).css("top", destination.top);
			$(record).css("left", destination.left);
		});

	}, delay);
}

function move_record_to_run(page_number, record_number, run_number, run_page_number, delay = 0, duration = STEP_DURATION, next_runs, slot_position = -1) {
	// Moves the record to the run, identified by the run number
	setTimeout(() => {

		let record = get_record(page_number, record_number);
		if (record == null) return;

		// Calculate the destination position (frames position) for thee record relative to the parent of the record,
		// i.e. the blox containing it, hence use css top and left since the element has position relative
		let current_record_position = $(record).position();
		let run_page = get_run_page(run_number, run_page_number, next_runs);
		let delta_position = {
			'left': $(run_page).offset().left - $(record).offset().left,
			'top': $(run_page).offset().top - $(record).offset().top
		};

		let additional_height_offset = 0;
		if (slot_position > 0) {
			// move the record to the slot position
			let border_width = get_actual_border_width()
			additional_height_offset = (get_record_height(true) * (record_number - slot_position)); // - border_width / num_of_records_per_page;
		}

		let destination = {
			// set the destination to use in the animate function
			// NOTE: I animate using top and left, so the offset() function might not be appropriate
			'left': current_record_position.left + delta_position.left + 'px',
			'top': current_record_position.top + delta_position.top - additional_height_offset + 'px'
		};

		// move the record to the frame, with a little animation
		$(record).animate({
			'left': destination.left,
			'top': destination.top
		}, duration, 'linear', function () {
			$(record).css("top", destination.top);
			$(record).css("left", destination.left);
		});

	}, delay);
}

function move_record_to_original_position(page_number, record_number, delay = 0, duration = STEP_DURATION) {
	// NOTE: to move the record to its original position, we need to set its relative position back to 0
	setTimeout(() => {
		// reorder all the records from their parent block, in the order they currently are,
		// meaning that the first record from top to bottom will be the first child, 
		//	the second record will be the second child, etc.
		// therefore, order records based on their top position

		let record = get_record(page_number, record_number);
		if (record == null) return;

		$(record).animate({
			'left': '0px',
			'top': '0px'
		}, duration, 'linear', function () {
			$(record).css("left", '0px');
			$(record).css("top", '0px');
		});
	}, delay);
}

function reparent_records_based_on_top_position(page_number) {
	let parent = get_file_page(page_number);
	let records = $(parent).children('.record').sort(function (a, b) {
		return $(a).position().top - $(b).position().top;
	});
	let first_child_top = $(records[0]).position().top;
	// reparent all the children in the new order, but obviously first remove them from their current parent
	$(parent).children('.record').remove();
	$(parent).append(records);
	// set all the records top position to the offset of the first record
	$(records).css("top", first_child_top);
}

function reparent_all_records_based_on_top_position(after_reparenting_new_top_positions, runs_contained_records_for_dishomogeneous_runs = []) {
	let records_list = $('.record').sort(function (a, b) {
		return $(a).offset().top - $(b).offset().top;
	});
	let pages = $('#file .block');
	if (runs_contained_records_for_dishomogeneous_runs.length == 0) {
		// Append records to page in the order of records_list until a page reaches its max number of records
		// NOTE: assuming runs to always have the max number of possible records in them 
		//		(the only run with a page having less than the max number of records is the last run, for the last page)
		for (let i = 0; i < pages.length; i++) {
			let page = pages[i];
			$(page).children('.record').remove();
			$(page).append(records_list.slice(i * num_of_records_per_page, (i * num_of_records_per_page) + num_of_records_per_page));
			$(page).children('.record').css("top", after_reparenting_new_top_positions[i]);
		}
	} else {
		// Assuming runs to also be dishomogeneous, meaning some runs may contain less records than the max per page in their last page
		//	This happens with the "replacement selection" strategy, and in this case the "after_reparenting_new_top_positions" is an array containing 
		// 		for each index i = run_number - 1, the number of records in the run
		let total_witten_records = 0;
		let page_index = 0;
		for (let j = 0; j < runs_contained_records_for_dishomogeneous_runs.length; j++) {
			let num_of_pages_of_this_run = Math.ceil(runs_contained_records_for_dishomogeneous_runs[j] / num_of_records_per_page);
			for (let i = page_index; i < page_index + num_of_pages_of_this_run; i++) {
				let page = pages[i];
				$(page).children('.record').remove();
				let num_of_records_to_append_for_this_page = num_of_records_per_page;
				if (i == page_index + num_of_pages_of_this_run - 1) num_of_records_to_append_for_this_page = (runs_contained_records_for_dishomogeneous_runs[j] - 1) % num_of_records_per_page + 1;
				$(page).append(records_list.slice(total_witten_records, total_witten_records + num_of_records_to_append_for_this_page));
				$(page).children('.record').css("top", after_reparenting_new_top_positions[i]);
				total_witten_records += num_of_records_to_append_for_this_page;
			}
			page_index += num_of_pages_of_this_run;
		}

	}
}

function reparent_all_records_based_on_given_list(record_objects_list, after_reparenting_new_top_positions, runs_contained_records_for_dishomogeneous_runs = []) {
	// let normal_records_list = $('.record');

	let records_list = $('.record').sort(function (a, b) {
		let record_a_index_in_records_objects_list = record_objects_list.findIndex((record_object) => { return parseInt(record_object.value) == parseInt($(a).attr("value")); });
		let record_b_index_in_records_objects_list = record_objects_list.findIndex((record_object) => { return parseInt(record_object.value) == parseInt($(b).attr("value")); });
		let record_a_total_number_in_file = (record_objects_list[record_a_index_in_records_objects_list].page_in_file - 1) * num_of_records_per_page + record_objects_list[record_a_index_in_records_objects_list].number_in_page_of_file;
		let record_b_total_number_in_file = (record_objects_list[record_b_index_in_records_objects_list].page_in_file - 1) * num_of_records_per_page + record_objects_list[record_b_index_in_records_objects_list].number_in_page_of_file;
		return record_a_total_number_in_file - record_b_total_number_in_file;
	});
	let pages = $('#file .block');
	if (runs_contained_records_for_dishomogeneous_runs.length == 0) {
		// Append records to page in the order of records_list until a page reaches its max number of records
		// NOTE: assuming runs to always have the max number of possible records in them 
		//		(the only run with a page having less than the max number of records is the last run, for the last page)
		for (let i = 0; i < pages.length; i++) {
			let page = pages[i];
			$(page).children('.record').remove();
			$(page).append(records_list.slice(i * num_of_records_per_page, (i * num_of_records_per_page) + num_of_records_per_page));
			$(page).children('.record').css("top", after_reparenting_new_top_positions[i]);
		}
	} else {
		// Assuming runs to also be dishomogeneous, meaning some runs may contain less records than the max per page in their last page
		//	This happens with the "replacement selection" strategy, and in this case the "after_reparenting_new_top_positions" is an array containing 
		// 		for each index i = run_number - 1, the number of records in the run
		let total_witten_records = 0;
		let page_index = 0;
		for (let j = 0; j < runs_contained_records_for_dishomogeneous_runs.length; j++) {
			let num_of_pages_of_this_run = Math.ceil(runs_contained_records_for_dishomogeneous_runs[j] / num_of_records_per_page);
			for (let i = page_index; i < page_index + num_of_pages_of_this_run; i++) {
				let page = pages[i];
				$(page).children('.record').remove();
				let num_of_records_to_append_for_this_page = num_of_records_per_page;
				if (i == page_index + num_of_pages_of_this_run - 1) num_of_records_to_append_for_this_page = (runs_contained_records_for_dishomogeneous_runs[j] - 1) % num_of_records_per_page + 1;
				$(page).append(records_list.slice(total_witten_records, total_witten_records + num_of_records_to_append_for_this_page));
				$(page).children('.record').css("top", after_reparenting_new_top_positions[i]);
				// $(page).children('.record').css("top", "0px");
				total_witten_records += num_of_records_to_append_for_this_page;
			}
			page_index += num_of_pages_of_this_run;
		}

	}
}

// Used for reparenting records after a multiple pages sort
function reparent_records_in_buffer_based_on_order(new_pages_and_orders) {

	let record_pages = new_pages_and_orders.map((page_and_order) => { return page_and_order.new_page_number; });
	for (let i = 0; i < record_pages.length; i++) {

		let page_number = record_pages[i];
		let frame_number = (page_number - 1) % num_of_frames_in_buffer + 1;
		let parent = get_file_page(page_number);

		let new_position_to_set = {
			'left': $(get_frame(frame_number)).offset().left - $(get_file_page(page_number)).offset().left,
			'top': $(get_frame(frame_number)).offset().top - $(get_file_page(page_number)).offset().top
		}

		// remove children of page and append all children to page based on the new_pages_and_orders array
		$(parent).children('.record').remove();
		for (let j = 0; j < new_pages_and_orders.length; j++) {

			let page_and_order = new_pages_and_orders[j];

			// append record to page if it belongs to this page
			if (page_and_order.new_page_number == page_number) {
				$(parent).append(page_and_order.record);
			}

		}

		let records = $(parent).children('.record');

		// set all the records top position to the offset of the first record
		$(records).css("top", new_position_to_set.top);
		$(records).css("left", new_position_to_set.left);
	}
}

function move_record_to_new_slot(page_number, record_number, slot_number, delay = 0, duration = STEP_DURATION) {
	// Moves the record to a new slot, identified by the slot number, 
	// the slot number is the position assigned to the n-th child, where n is the slot number, in its parent block
	setTimeout(() => {

		let record = get_record(page_number, record_number);
		if (record == null) return;

		// Calculate the destination position (frames position) for thee record relative to the parent of the record,
		// i.e. the blox containing it, hence use css top and left since the element has position relative
		let border_width = get_actual_border_width()
		let destination_height = parseFloat($(record).css("top")) - (get_record_height(true) * (record_number - slot_number)); //- border_width / num_of_records_per_page;

		// move the record to the frame, with a little animation
		$(record).animate({
			'top': destination_height
		}, duration * 0.95, 'linear', function () {
			$(record).css("top", destination_height);
		});

	}, delay);
}


function move_record_to_new_slot_in_another_frame(current_page_number, record_number, new_frame_number, slot_number, delay = 0, duration = STEP_DURATION) {
	// Moves the record to a new slot, identified by the slot number, 
	// the slot number is the position assigned to the n-th child, where n is the slot number, in its parent block
	setTimeout(() => {

		let record = get_record(current_page_number, record_number);
		if (record == null) {
			return;
		}

		let frame = get_frame(new_frame_number);

		// Calculate the destination position (frames position) for thee record relative to the parent of the record,
		// i.e. the bloxk containing it, hence use css top and left since the element has position relative
		let current_record_position = $(record).position();
		let delta_position = {
			'left': $(frame).offset().left - $(record).offset().left,
			'top': $(frame).offset().top - $(record).offset().top
		};

		// Calculate the destination position (frames position) for thee record relative to the parent of the record,
		// i.e. the blox containing it, hence use css top and left since the element has position relative
		let border_width = get_actual_border_width()
		let destination_height = (current_record_position.top + delta_position.top) - (get_record_height(true) * (record_number - slot_number)); //- border_width / num_of_records_per_page;

		/* ------------------------------------------------- */

		let destination = {
			// set the destination to use in the animate function
			// NOTE: I animate using top and left, so the offset() function might not be appropriate
			'left': current_record_position.left + delta_position.left + 'px',
			'top': destination_height + 'px'
		};

		// move the record to the frame, with a little animation
		$(record).animate({
			'top': destination.top,
			'left': destination.left
		}, duration * 0.95, 'linear', function () {
			$(record).css("top", destination.top);
			$(record).css("left", destination.left);
		});

	}, delay);
}


function move_page_to_frame(page_number, frame_number, delay = 0, duration = STEP_DURATION) {
	let page = get_file_page(page_number);
	let records = $(page).find(".record");

	setTimeout(() => {
		let scroll_duration = STEP_DURATION;
		if (duration < 0.01) {
			scroll_duration = 0;
		}
		scroll_to_focused_element($(get_frame(frame_number)), scroll_duration);
	}, delay);

	records.each(function () {
		move_record_to_frame(this, frame_number, delay, duration);
	});
}

function move_page_to_original_position(page_number, delay = 0, duration = STEP_DURATION, scroll_to_page = true) {
	let page = get_file_page(page_number);
	let records = $(page).find(".record");

	if (scroll_to_page) {
		setTimeout(() => {
			let scroll_duration = STEP_DURATION;
			if (duration < 0.01) {
				scroll_duration = 0;
			}
			scroll_to_focused_element($(page), scroll_duration);
		}, delay);
	}

	records.each(function (index) {
		move_record_to_original_position(page_number, index + 1, delay, duration);
	});
}

function move_page_to_run(page_number, run_number, run_page_number, delay = 0, duration = STEP_DURATION) {
	let page = get_file_page(page_number);
	if (page == null) {
		if (LOG_DEBUG) console.log("Trying to move a null page");
		return;
	}

	setTimeout(() => {
		let scroll_duration = STEP_DURATION;
		if (duration < 0.01) {
			scroll_duration = 0;
		}
		scroll_to_focused_element($(get_run_page(run_number, run_page_number)), scroll_duration);
	}, delay);

	$(page).find(".record").each(function (index) {
		let record_number = index + 1;
		move_record_to_run(page_number, record_number, run_number, run_page_number, delay, duration);
	});
}

function hide_page(page_number, delay = 0) {
	let page = get_file_page(page_number);
	setTimeout(() => {
		$(page).hide();
	}, delay);
}

function move_record_by_pixels(page_number, record_number, delta_x, delta_y, delay = 0, duration = STEP_DURATION) {
	setTimeout(() => {
		let record = get_record(page_number, record_number);
		if (record == null) return;
		let left_pos = Math.round(parseInt(record.css("left")) + delta_x);
		let top_pos = Math.round(parseInt(record.css("top")) + delta_y);
		record.animate({
			// move record from its position (i.e. css "left") to 120 px more to the right
			"left": left_pos + "px",
			"top": top_pos + "px"
		}, (animate ? duration : 0), "linear");
	}, delay);
}

function show_runs(animation_time = STEP_DURATION, set_next_runs = false) {

	let elem_selector = "#runs-container";
	if (set_next_runs) elem_selector = "#runs-container-next";

	$(elem_selector).animate({
		width: "100%"
	}, animation_time, "linear");
}

function hide_runs(animation_time = STEP_DURATION, set_next_runs = false) {
	let elem_selector = "#runs-container";
	if (set_next_runs) elem_selector = "#runs-container-next";

	$(elem_selector).animate({
		width: "0%"
	}, animation_time, "linear");
}

function set_single_run(run_number, total_pages_per_run, set_next_runs = false) {
	// check if the #runs-container contains a run at the specified run number, if not, add it
	let elem_selector = "#runs-container";
	if (set_next_runs) elem_selector = "#runs-container-next";

	// if this is the first run being created, remove all runs in the #runs-container
	if (run_number == 1) {
		$(elem_selector).empty();
	}

	// Remove all runs equal or after the specified run number
	if ($(elem_selector).find(".blocks-wrapper").length >= run_number) {
		// remove all runs after the specified run number
		$(elem_selector).find(".blocks-wrapper").each(function (index) {
			if (index + 1 >= run_number) {
				$(this).remove();
			}
		});
	}

	let run_html_start =
		'<div id="run" class="blocks-wrapper">' +
		'<div class="blocks-container">';
	let run_page_html = '<div class="block"><div class="block-name"></div></div>';
	let run_html_end =
		'</div>' +
		'<div class="blocks-container-name-v2"></div>' +
		'</div>';
	let run_html = run_html_start;

	// attach as many blocks to the run as the number of pages per run,
	// but do not exceed the total number of pages of the file
	for (let j = 0; j < total_pages_per_run; j++) {
		run_html += run_page_html;
	}

	run_html += run_html_end;

	run_html = $(run_html);
	// set the width of the run with the specified run number to 0%
	$(run_html).css("width", "0px");
	// also set padding left and padding right to 0px
	$(run_html).css("padding-left", "0px");
	$(run_html).css("padding-right", "0px");
	$(run_html).css("border-width", "0px");

	$(elem_selector).append(run_html);
}

function show_single_run(run_number, delay = 0, animation_time = STEP_DURATION, set_next_runs = false, show_runs_container = false) {
	setTimeout(() => {
		if (show_runs_container) show_runs(animation_time, set_next_runs);

		let elem_selector = "#runs-container";
		if (set_next_runs) elem_selector = "#runs-container-next";

		// scroll to first run page
		let scroll_duration = STEP_DURATION / 2;
		if (animation_time < 0.01) {
			scroll_duration = 0;
		}
		scroll_to_focused_element($(elem_selector).children("#run").eq(run_number - 1).find(".block").eq(0).get(0), scroll_duration);

		// set the width of the run with the specified run number to 100%
		let width_of_block = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-dim'));
		let border_thickness = get_actual_border_width();

		$(elem_selector).children("#run").eq(run_number - 1).animate({
			width: (width_of_block + 5 * 2).toString() + "px",
			paddingLeft: "16px",
			paddingRight: "16px",
			borderWidth: border_thickness + "px"
		}, animation_time, "linear");

	}, delay);
}

function hide_single_run(run_number, delay = 0, animation_time = STEP_DURATION, set_next_runs = false, hide_runs_container = false) {

	if (hide_runs_container) hide_runs(animation_time, set_next_runs);

	let elem_selector = "#runs-container";
	if (set_next_runs) elem_selector = "#runs-container-next";

	setTimeout(() => {
		$(elem_selector).children("#run").eq(run_number - 1).animate({
			width: "0px",
			paddingLeft: "0px",
			paddingRight: "0px",
			borderWidth: "0px"
		}, animation_time, "linear");
	}, delay);
}

function reorder_records_of_page_based_on_original_values(page_number, delay = 0, delay_between = 0, animation_time = STEP_DURATION) {
	// reorder records in their original order, as stored in the "record_values" array
	// NOTE: this should basically be the analogous of "sort_records_of_page", but setting records position so that they follow
	// the order of the "record_values" array

	setTimeout(() => {
		// get the records of the page that is currently in the frame
		let records = [];
		for (let i = 0; i < num_of_records_per_page; i++) {
			let record = get_record(page_number, i + 1);
			if (record != null) {
				records.push(record);
			}
		}
		// create an array of records
		let records_array = [];
		for (let i = 0; i < records.length; i++) {
			let value = parseInt($(records[i]).attr('value'));
			records_array.push({
				index: i,
				value: value
			});
		}
		// sort the array of records
		records_array.sort(function (a, b) {
			// return a number such that the records in the records array follow the original order of the records
			// stored in the "record_values" array
			return original_records_values_order[(a.value - 1)].index > original_records_values_order[(b.value - 1)].index ? 1 : -1;
		});
		// move the records to their new position
		for (let i = 0; i < records_array.length; i++) {
			let number = parseInt(records_array[i].index) + 1;
			let new_slot_number = i + 1;
			move_record_to_new_slot(page_number, number, new_slot_number, i * delay_between, animation_time);
		}
		setTimeout(() => {
			reparent_records_based_on_top_position(page_number);
		}, animation_time * 1.125 + ANIMATION_STEP_MULTIPLIER);
	}, delay);
}

function reorder_records_of_multiple_pages_based_on_original_values(from_page_number, to_page_number, delay = 0, delay_between = 0, animation_time = STEP_DURATION) {
	// reorder records of MULTIPLE PAGES in their original order, as stored in the "record_values" array
	// NOTE: this should basically be the analogous of "sort_records_of_multiple_pages_in_buffer", but setting those pages' records 
	//  position so that they follow the order of the "record_values" array
	setTimeout(() => {
		// get the records of the pages that are currently in the frame
		let page_numbers = [];
		for (let i = from_page_number; i <= to_page_number; i++) {
			page_numbers.push(i);
		}
		let records = [];
		for (let i = 0; i < page_numbers.length; i++) {
			let page_number = page_numbers[i];
			for (let j = 0; j < num_of_records_per_page; j++) {
				let record = get_record(page_number, j + 1);
				if (record != null) {
					records.push(record);
				}
			}
		}
		// create an array of records
		let records_array = [];
		for (let i = 0; i < records.length; i++) {
			records_array.push({
				'current_record_number': (i % num_of_records_per_page) + 1,
				'value': $(records[i]).attr('value'),
				'page_number': Math.floor(i / num_of_records_per_page) + from_page_number
			});
		}
		// "sort" the array of records
		records_array.sort(function (a, b) {
			// return a number such that the records in the records array follow the original order of the records
			// stored in the "record_values" array
			return original_records_values_order[(a.value - 1)].index > original_records_values_order[(b.value - 1)].index ? 1 : -1;
		});
		// move the records to their new position
		new_records_order = [];
		for (let i = 0; i < records_array.length; i++) {
			let current_record_page_number = records_array[i].page_number;
			let current_record_number = records_array[i].current_record_number;
			let new_slot_number = (i % num_of_records_per_page) + 1;
			let new_record_frame_number = Math.floor(i / num_of_records_per_page) + 1;

			let record = get_record(current_record_page_number, current_record_number);
			if (record != null) {
				new_records_order.push({
					'record': record,
					'top': $(record).css('top'),
					'old_page_number': current_record_page_number,
					'new_page_number': (page_numbers[0] - 1) + Math.floor(i / num_of_records_per_page) + 1,
				});
			}

			move_record_to_new_slot_in_another_frame(current_record_page_number, current_record_number, new_record_frame_number, new_slot_number, i * delay_between, animation_time);
		}
		setTimeout(() => {
			for (let i = 0; i < page_numbers.length; i++) {
				reparent_records_in_buffer_based_on_order(new_records_order);
			}
		}, animation_time * 1.125 + ANIMATION_STEP_MULTIPLIER);
	}, delay);
}

function sort_records_of_page(page_number, delay = 0, delay_between = 0, animation_time = STEP_DURATION) {
	// sort records and move the records in their respective sorted position
	setTimeout(() => {
		// get the records of the page that is currently in the frame
		let records = [];
		for (let i = 0; i < num_of_records_per_page; i++) {
			let record = get_record(page_number, i + 1);
			if (record != null) {
				records.push(record);
			}
		}
		// create an array of records
		let records_array = [];
		for (let i = 0; i < records.length; i++) {
			records_array.push({
				'number': i + 1,
				'value': $(records[i]).attr('value')
			});
		}
		// sort the array of records
		records_array.sort(function (a, b) {
			return a.value - b.value;
		});
		// move the records to their new position
		for (let i = 0; i < records_array.length; i++) {
			let number = records_array[i].number;
			let new_slot_number = i + 1;
			move_record_to_new_slot(page_number, number, new_slot_number, i * delay_between, animation_time);
		}
		setTimeout(() => {
			reparent_records_based_on_top_position(page_number);
		}, animation_time * 1.125 + ANIMATION_STEP_MULTIPLIER);
	}, delay);
}

function sort_records_of_multiple_pages_in_buffer(from_page_number, to_page_number, delay = 0, delay_between = 0, animation_time = STEP_DURATION) {
	// sort records of the pages given, and move the records in their respective sorted position and in their corresponding page, in order of page number
	setTimeout(() => {
		// get the records of the pages that are currently in the frame
		let page_numbers = [];
		for (let i = from_page_number; i <= to_page_number; i++) {
			page_numbers.push(i);
		}
		let records = [];
		for (let i = 0; i < page_numbers.length; i++) {
			let page_number = page_numbers[i];
			for (let j = 0; j < num_of_records_per_page; j++) {
				let record = get_record(page_number, j + 1);
				if (record != null) {
					records.push(record);
				}
			}
		}
		// create an array of records
		let records_array = [];
		for (let i = 0; i < records.length; i++) {
			records_array.push({
				'current_record_number': (i % num_of_records_per_page) + 1,
				'value': $(records[i]).attr('value'),
				'page_number': Math.floor(i / num_of_records_per_page) + from_page_number
			});
		}
		// sort the array of records
		records_array.sort(function (a, b) {
			return a.value - b.value;
		});
		// move the records to their new position
		new_records_order = [];
		for (let i = 0; i < records_array.length; i++) {
			let current_record_page_number = records_array[i].page_number;
			let current_record_number = records_array[i].current_record_number;
			let new_slot_number = (i % num_of_records_per_page) + 1;
			let new_record_frame_number = Math.floor(i / num_of_records_per_page) + 1;

			let record = get_record(current_record_page_number, current_record_number);
			if (record != null) {
				new_records_order.push({
					'record': record,
					'top': $(record).css('top'),
					'old_page_number': current_record_page_number,
					'new_page_number': (page_numbers[0] - 1) + Math.floor(i / num_of_records_per_page) + 1,
				});
			}

			move_record_to_new_slot_in_another_frame(current_record_page_number, current_record_number, new_record_frame_number, new_slot_number, i * delay_between, animation_time);
		}
		setTimeout(() => {
			for (let i = 0; i < page_numbers.length; i++) {
				reparent_records_in_buffer_based_on_order(new_records_order);
			}
		}, animation_time * 1.125 + ANIMATION_STEP_MULTIPLIER);
	}, delay);

}

function get_file_page(page_number) {
	if (page_number < 0 || page_number > $('#file .block').length) {
		if (LOG_DEBUG) console.log('Invalid file page number: ' + page_number);
		return null;
	}
	return $('#file .block:nth-child(' + (page_number).toString() + ')');
}

/**
 * @description Returns the frame with the specified frame number (if frame_number == -1, returns the last frame)
 * NOTE: lets you retrieve the last frame even by passing its actual number (not -1)
 */
function get_frame(frame_number) {
	if (frame_number != -1 && (frame_number < 0 || frame_number > $('#frame-buffer .block').length)) {
		if (LOG_DEBUG) console.log('Invalid frame number: ' + frame_number);
		return null;
	}
	if (frame_number == -1) {
		// Returns output frame
		return $('#frame-buffer .block:last-child');
	} else {
		return $('#frame-buffer .block:nth-child(' + (frame_number).toString() + ')');
	}
}

function get_run_page(run_number, run_page_number, next_runs = false) {

	let elem_selector = "#runs-container";
	if (next_runs) elem_selector = "#runs-container-next";

	if (run_number < 0 || run_number > $(elem_selector + ' #run').length) {
		if (LOG_DEBUG) console.log('Invalid run number: ' + run_number);
		return null;
	}
	if (run_page_number < 0 || run_page_number > $(elem_selector + ' #run:nth-child(' + (run_number).toString() + ') .block').length) {
		if (LOG_DEBUG) console.log('Invalid run page number: ' + run_page_number + ' (for run number ' + run_number + ')');
		return null;
	}
	return $(elem_selector + ' #run:nth-child(' + (run_number).toString() + ') .block:nth-child(' + (run_page_number).toString() + ')');
}

function get_record(record_page_number, record_number) {
	// take the block name into account
	let actual_record_number = record_number + 1;
	if (record_page_number - 1 < 0 || record_page_number - 1 > $('#file .block').length) {
		if (LOG_DEBUG) console.log('Invalid (record) page number: ' + record_page_number);
		return null;
	}
	if (actual_record_number - 1 < 0 || actual_record_number - 1 > $('#file .block:nth-child(' + (record_page_number).toString() + ') .record').length) {
		if (LOG_DEBUG) console.log('Invalid record number: ' + actual_record_number + ' (for record page number ' + record_page_number + ')');
		return null;
	}
	return $('#file .block:nth-child(' + (record_page_number).toString() + ') .record:nth-child(' + (actual_record_number).toString() + ')').first();
}

function reparent_all_file_pages_to_runs(next_runs = false) {
	// Move each file page (.block) inside the runs' pages (.block) in same order

	let elem_selector = "#runs-container";
	if (next_runs) elem_selector = "#runs-container-next";

	let pages = $("#file .block");
	let run_pages = $(elem_selector + " .block");

	// move each page into the runs container (i.e. copy thr html of each page into the runs container, and remove it from the file container)
	for (let i = 0; i < pages.length; i++) {
		let page = pages[i];
		let run_page = run_pages[i];
		$(run_page).html($(page).html());
	}
	$("#file .block .record").remove();

	// Select all records and make their "left" 0
	$(elem_selector + " .record").css("left", "0px");
	$(elem_selector + " .record").css("top", "0px");

}

// Move each run page (.block) inside the file's pages (.block) in same order
function reparent_all_runs_pages_to_file(next_runs = false) {

	let elem_selector = "#runs-container";
	if (next_runs) elem_selector = "#runs-container-next";

	let pages = $("#file .block");
	let run_pages = $(elem_selector + " .block");

	// move each page into the runs container (i.e. copy thr html of each page into the runs container, and remove it from the file container)
	for (let i = 0; i < pages.length; i++) {
		let page = pages[i];
		let run_page = run_pages[i];
		$(page).html($(run_page).html());
	}
	run_pages.remove();

	// Select all records and make their "left" 0 (needed? correct?)
	$("#file .record").css("left", "0px");
	$("#file .record").css("top", "0px");
}

function create_records_grayed_copies(parent_container = "#file", pages_of_file = num_of_pages_of_file) {
	// Empty current copies
	delete_records_grayed_copies(parent_container);
	for (i = 0; i < pages_of_file; i++) {
		let page_number = i + 1;
		for (j = 0; j < num_of_records_per_page; j++) {
			let record_number = j + 1;
			let record = get_record(page_number, record_number);
			if (record == null) continue;
			create_single_record_grayed_copy(record, parent_container);
		}
	}
}

function delete_records_grayed_copies(parent_container_selector = "#file") {
	// Empty current copies
	if ($(parent_container_selector + " #copies-container").length > 0) {
		$(parent_container_selector + " #copies-container").empty();
	}
}

function create_single_record_grayed_copy(record, parent_container = "#file") {

	// Copy the given record, place it into the "#copies-container" element, also mainitaining its position
	let copy = $(record).clone();
	// change copy's class to "record-copy"
	copy.removeClass("record");
	copy.addClass("record-copy");

	// change copy's color to gray
	copy.css("background-color", "gray");

	// change copy's parent to "#copies-container"
	if ($(parent_container + " #copies-container").length == 0) {
		if (LOG_DEBUG) console.log("Parent to which appending to is not present, creating and appending it...");
		$(parent_container).append("<div id='copies-container'></div>");
	}
	copy.appendTo(parent_container + " #copies-container");

	// copy record's position 
	copy.offset(record.offset());

	// set original width in pixels
	copy.css("width", record.width() + "px");
	// set original height in pixels
	copy.css("height", record.height() + "px");

}

function move_record_grayed_copy_by_pixels(record_number, delta_x, delta_y, delay = 0, duration = STEP_DURATION) {
	setTimeout(() => {
		let record = $("#copies-container .record-copy:nth-child(" + record_number + ")");
		if (record == null) return;
		let left_pos = Math.round(parseInt(record.css("left")) + delta_x);
		let top_pos = Math.round(parseInt(record.css("top")) + delta_y);
		record.animate({
			// move record from its position (i.e. css "left") to 120 px more to the right
			"left": left_pos + "px",
			"top": top_pos + "px"
		}, (animate ? duration : 0), "linear");
	}, delay);
}

function move_all_record_grayed_copy_by_pixels(delta_x, delta_y, delay = 0, duration = STEP_DURATION) {
	for (let i = 0; i < num_of_records_of_file; i++) {
		let record_number = i + 1;
		move_record_grayed_copy_by_pixels(record_number, delta_x, delta_y, delay, duration);
	};
}

function snap_all_record_grayed_copies_to_horizontal_position(pos_x, parent_container) {
	for (let i = 0; i < num_of_records_of_file; i++) {
		let record_number = i + 1;
		let record = $(parent_container + " #copies-container .record-copy:nth-child(" + record_number + ")");
		if (record == null || record.length == 0) continue;
		// Snap the record to the given position
		record.offset({
			left: pos_x,
			top: record.offset().top
		});
	};
}

function snap_all_records_to_horizontal_position(pos_x, pages_of_file = num_of_pages_of_file) {
	for (i = 0; i < pages_of_file; i++) {
		let page_number = i + 1;
		for (j = 0; j < num_of_records_per_page; j++) {
			let record_number = j + 1;
			let record = get_record(page_number, record_number);
			if (record == null) continue;

			let left_pos = pos_x - $(get_file_page(page_number)).offset().left;
			record.css("left", left_pos + "px");
		}
	}
}

/**
 * @description Move the hightlight line of the code to the specified line (from 1 to 25)
 */
function move_code_line_to(code_lines_to_move_to, code_line_offset = 0) {


	let animation_time = Math.min(STEP_DURATION / 2, 100);

	if (code_lines_to_move_to.find((line) => { return line == -1; }) != undefined) {
		// Hiding the code highlight (passed "[-1]" as code_lines_to_move_to)
		$(".code .highlight").animate({
			"height": "0px"
		}, animation_time / 2, "linear");
		let offset = 20.5 * 1 - 23.5;
		$(".code .highlight").animate({
			"top": offset + "px"
		}, animation_time, "linear");
		return;
	}

	if (!enable_algorithm_lines_highlighting) return;

	if (code_lines_to_move_to.find((line) => { return line == 0; }) != undefined) {
		if (LOG_DEBUG) console.log("ERROR: code line numbers should start from 1");
		return;
	}

	// Move to first line of the range 
	let offset = 20.5 * (code_lines_to_move_to[0] + code_line_offset) - 23.5;
	$(".code .highlight").animate({
		"top": offset + "px"
	}, animation_time, "linear");

	// Makes highlight taller to span the number of lines indicated
	let highlight_height = 20.5 * code_lines_to_move_to.length + 5;
	if (code_lines_to_move_to.length > 1) {
		$(".code .highlight").animate({
			"height": highlight_height + "px"
		}, animation_time / 2, "linear");
	} else {
		$(".code .highlight").animate({
			"height": "27px"
		}, animation_time / 2, "linear");
	}

	// Scroll the element accordingly if the line is not visible
	let active_code_container = $("#algorithm .code-container").not(":hidden");
	let code_scroll_height = active_code_container.find(".code").first().prop('scrollHeight');
	let code_scroll_top = active_code_container.find(".code").first().scrollTop();
	let code_displayed_height = active_code_container.find(".code").first().height();
	let total_code_lines = active_code_container.find(".code").first().find("div").length - 1;

	if (code_scroll_height > code_displayed_height) {

		// Scroll the element so that the entire highlight, which has height "highlight_height", is visible,
		// and at the center of the scroll section (if possible)
		let scroll_to = offset - (code_displayed_height - highlight_height) / 2;
		if (scroll_to < 0) scroll_to = 0;
		if (scroll_to > code_scroll_height - code_displayed_height) scroll_to = code_scroll_height - code_displayed_height;
		active_code_container.find(".code").first().animate({
			scrollTop: scroll_to
		}, animation_time, "linear");
	}
}