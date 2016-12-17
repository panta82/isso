#!/bin/sh
# PROVIDE: isso
# REQUIRE: LOGIN
# KEYWORD: shutdown
#
# Add the following line to /etc/rc.conf[.local] to enable isso
#
# isso_enable (bool):           Set to "NO" by default.
#                               Set it to "YES" to enable isso.

. /etc/rc.subr

name="isso"
rcvar=${name}_enable
load_rc_config $name

: ${isso_enable="NO"}
: ${isso_config="/home/pantas/local/etc/isso.ini"}
: ${isso_pidfile="/usr/local/var/run/isso.pid"}
: ${isso_logfile="/home/pantas/local/var/log/isso.log"}

pidfile=${isso_pidfile}
required_files="${isso_config}"
command=/usr/sbin/daemon
command_args="-r -P ${isso_pidfile} -u pantas /home/pantas/.pyvenv/isso/bin/isso -c '${isso_config}'"

export PATH="/home/pantas/.pyvenv/isso/bin:/home/pantas/local/bin:/home/pantas/.pyenv/bin:${PATH}"

start_cmd="isso_start_cmd"

isso_start_cmd()
{
    echo $pidfile
    echo $procname
    pid=$(check_pidfile "$pidfile" "$procname")
    if [ ! -z "$pid" ]; then
    	warn "$name is already running. PID: ${pid}, as per ${isso_pidfile}"
    	return 1
    fi

    cd /home/pantas/isso

    echo "------------------------------------------------------------------------------------------------------" >> $isso_logfile
    echo "service start ${name} executed at $(date)" >> $isso_logfile
    echo "${command} ${command_args} 2>&1 >> $isso_logfile" >> $isso_logfile
    eval "${command} ${command_args} 2>&1 >> $isso_logfile"
}

run_rc_command "$@"