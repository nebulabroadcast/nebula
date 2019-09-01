Nebula
======

Nebula is an open source broadcast automation and media asset management system for television, radio and VOD platforms.
Since 2012 Nebula has proven stable and reliable software in 24/7 broadcast environment and it is now used by TV and production companies worldwide.

Key features
------------

 - media asset management, metadata handling
 - process automation (media conversion and analysis)
 - programme planning, scheduling
 - linear playout control
 - web and social publishing
 - statistics, reporting
 - extensible using plugins, scripts and custom services

Installation
------------

See [nebula-setup](https://github.com/nebulabroadcast/nebula-setup)
for installation scripts and instructions.

After initial setup, use `make install` to create symlinks for command line utilities
and create your first user using `./manage.py adduser` command.

During the setup, it is recommended to run `./manage.py run hub` and `./nebula.py` commands in
GNU `screen` to see potential errors, but `make install` also creates `nebula` and `nebula-hub`
systemd units (disabled by default), which you may use to run the software in production.

 - systemd units assume nebula is installed in `/opt/nebula/`
 - `nebula` service waits 30 seconds before it is started by systemd

To view a nebula log in realtime, use `nxl` command.

Need help?
----------

Professional support for Nebula is provided by [Nebula Broadcast](https://nebulabroadcast.com)
