require("./zerorpc_client.js")();
var settings = require("./settings.js");

let tasks_map = {};

function Task (task_id, task_type) {
    this.id = task_id;
    this.type = task_type;
}

function finish_job() {
    var finished_one = false;
    for (var i = 0; i < jobs.length; i ++) {
	    if (jobs[i] == false) {
	        if (!finished_one) {
		        jobs[i] = true;
		        finished_one = true;
		        continue;
	        } else {
		        return;
	        }
	    }
    }
    // if we get here it means we finished all jobs
    $('#top-loading-icon').removeClass().addClass('fa fa-check-circle fa-fw');
    // also save the dashboard page
    settings.page_index = $('#page-wrapper').html();
}

function showAlert(type, text) {
    var str = '<div class="alert '+ type +' alert-dismissable"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>'+ text +'</div>';
    $(str).prependTo($("#wrapper"));
}

function create_exchange_box(exchange, number, currency_icon) {
    var css_class = 'exchange-icon-inverted';
    if (exchange == 'poloniex') {
	    css_class = 'exchange-icon';
    }
    // only show 2 decimal digits
    number = number.toFixed(2);
    var str = '<div class="panel panel-primary"><div class="panel-heading" id="'+exchange+'_box"><div class="row"><div class="col-xs-3"><i><img title="' + exchange + '" class="' + css_class + '" src="images/'+ exchange +'.png"  /></i></div><div class="col-xs-9 text-right"><div class="huge">'+ number +'</div><div id="status_box_text"><i class="fa '+ currency_icon + ' fa-fw"></i></div></div></div></div><a href="#"><div class="panel-footer"><span class="pull-left">View Details</span><span class="pull-right"><i class="fa fa-arrow-circle-right"></i></span><div class="clearfix"></div></div></a></div>';
    return $(str);
}

function create_box (id, icon, number, currency_icon) {
    // only show 2 decimal digits
    number = number.toFixed(2);
    var str = '<div class="panel panel-primary"><div class="panel-heading" id="'+id+'"><div class="row"><div class="col-xs-3"><i title="' + id + '" class="fa '+ icon +'  fa-5x"></i></div><div class="col-xs-9 text-right"><div class="huge">'+ number +'</div><div id="status_box_text"><i class="fa '+ currency_icon + ' fa-fw"></i></div></div></div></div><a href="#"><div class="panel-footer"><span class="pull-left">View Details</span><span class="pull-right"><i class="fa fa-arrow-circle-right"></i></span><div class="clearfix"></div></div></a></div>';
    return $(str);
}

function set_ui_main_currency(currency) {
    $('#current-main-currency').removeClass().addClass('fa ' + currency.icon + ' fa-fw');
}

function add_currency_dropdown(currency) {
    var str = '<li><a id="change-to-'+ currency.ticker_symbol.toLowerCase() +'" href="#"><div><i class="fa '+ currency.icon +' fa-fw"></i> Set '+ currency.name +' as the main currency</div></a></li><li class="divider"></li>';
    $(str).appendTo($(".currency-dropdown"));

    $('#change-to-'+ currency.ticker_symbol.toLowerCase()).bind('click', function() {
	    client.invoke("set_main_currency", currency.ticker_symbol, (error, res) => {
	        if(error) {
		        showAlert('alert-danger', error);
	        } else {
		        set_ui_main_currency(currency);
	        }
	    });
    });
}

function get_initial_settings() {
    client.invoke("get_initial_settings", (error, res) => {
        if (error || res == null) {
	        var loading_wrapper = document.querySelector('.loadingwrapper');
	        var loading_wrapper_text = document.querySelector('.loadingwrapper_text');
	        console.log("get_initial_settings response was: " + res);
	        console.error("get_initial_settings error was: " + error);
	        loading_wrapper.style.background = "rgba( 255, 255, 255, .8 ) 50% 50% no-repeat";
	        loading_wrapper_text.textContent = "ERROR: Failed to connect to the backend. Check Log";
        } else {
	        // set main currency
	        console.log("server is ready");
	        settings.main_currency = res['main_currency'];
	        for (var i = 0; i < settings.CURRENCIES.length; i ++) {
	            if (settings.main_currency == settings.CURRENCIES[i].ticker_symbol) {
		            set_ui_main_currency(settings.CURRENCIES[i]);
		            settings.main_currency = settings.CURRENCIES[i];
		            break;
	            }
	        }
	        // make separate queries for all registered exchanges
	        let exchanges = res['exchanges'];
	        for (var i = 0; i < exchanges.length; i++) {
	            client.invoke("query_exchange_total_async", exchanges[i], true, function (error, res) {
		            if (error || res == null) {
		                console.log("Error at first query of an exchange's balance: " + error);
		            } else {
				console.log(exchanges[i] + " Exchange Query returned task id " + res['task_id']);
				tasks_map[res['task_id']] = new Task(res['task_id'], 'query_exchange_total');
		            }
	            });
	        }
	        $("body").removeClass("loading");
        }
    });
}

function get_blockchain_total() {
    client.invoke("query_blockchain_total_async", (error, res) => {
        if (error || res == null) {
	        console.log("Error at querying blockchain total: " + error);
        } else {
	    console.log("Blockchain total returned task id " + res['task_id']);
	    tasks_map[res['task_id']] = new Task(res['task_id'], 'query_blockchain_total');
        }
    });
}

function get_banks_total() {
    // does not really need to be async at the moment as it's just a file read
    // but trying to be future proof
    client.invoke("query_banks_total_async", (error, res) => {
        if (error || res == null) {
	        console.log("Error at querying bank total: " + error);
        } else {
	    console.log("Query banks returned task id " + res['task_id']);
	    tasks_map[res['task_id']] = new Task(res['task_id'], 'query_banks_total');
        }
    });
}




function create_or_reload_dashboard() {
    if (!settings.page_index) {
        $("body").addClass("loading");
        console.log("At create/reload, with a null page index");
        get_initial_settings();
        get_blockchain_total();
        get_banks_total();
    } else {
        console.log("At create/reload, with a Populated page index");
        $('#page-wrapper').html(settings.page_index);
    }
}

function monitor_tasks() {
    if (Object.keys(tasks_map).length == 0) {
	// if we get here it means we finished all jobs
	$('#top-loading-icon').removeClass().addClass('fa fa-check-circle fa-fw');
	// also save the dashboard page
	settings.page_index = $('#page-wrapper').html();
	return;
    }


    // else it means we still need to have data to load
    $('#top-loading-icon').removeClass().addClass('fa fa-circle-o-notch fa-spin fa-fw');
    
    for (var task_id in tasks_map) {
	let task = tasks_map[task_id];
	if (task.id == null) {
	    console.log('NULL TASK ID: ' + JSON.stringify(task, null, 4));
	    continue;
	}
	
	client.invoke("query_task_result", task.id, function (error, res) {
	    console.log("monitor_tasks. Querying task " + task.id);
	        if (res != null) {
		        console.log("monitor_tasks with result");
		        if (task.type == 'query_exchange_total') {
		            create_exchange_box(
				res['name'],
				parseFloat(res['total']),
				settings.main_currency.icon).appendTo($('#leftest-column'));
		        } else if (task.type == 'query_blockchain_total') {
	                    create_box(
				'blockchain balance',
				'fa-hdd-o',
				parseFloat(res['total']),
				settings.main_currency.icon).appendTo($('#leftest-column'));
		        } else if (task.type == 'query_banks_total') {
	                    create_box('banks balance',
				       'fa-university',
				       parseFloat(res['total']),
				       settings.main_currency.icon).appendTo($('#leftest-column'));
		        } else {
		            console.log('Unrecognized task type ' + task.type);
		        }
		    console.log('Deleting task ' + task.id + ' from map');
		    delete tasks_map[task.id];
	        }
	    });
	    
    }
}
// monitor tasks every 2 seconds
setInterval(monitor_tasks, 2000);

module.exports = function() {

    this.create_exchange_box = create_exchange_box;
    this.create_box = create_box;
    this.set_ui_main_currency = set_ui_main_currency;
    this.add_currency_dropdown = add_currency_dropdown;
    this.create_or_reload_dashboard = create_or_reload_dashboard;
};


