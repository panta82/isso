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
: ${isso_logout="/home/pantas/local/var/log/isso_out.log"}
: ${isso_logerr="/home/pantas/local/var/log/isso_err.log"}

pidfile=${isso_pidfile}
required_files="${isso_config}"
command=/usr/sbin/daemon
command_args="-f -r -P ${isso_pidfile} -u pantas /home/pantas/isso/misc/logwrapper.sh '${isso_logout}'"\
 "'${isso_logerr}' /home/pantas/.pyvenv/isso/bin/isso -c '${isso_config}'"

export PATH="/home/pantas/.pyvenv/isso/bin:/home/pantas/local/bin:/home/pantas/.pyenv/bin:${PATH}"

start_precmd="isso_start_precmd"

isso_start_precmd()
{
    cd /home/pantas/isso

    echo "------------------------------------------------------------------------------------------------------" >> "$isso_logout"
    echo "service start ${name} at $(date)" >> "$isso_logout"
    echo "${command} ${command_args}" >> "$isso_logout"
}

run_rc_command "$@"