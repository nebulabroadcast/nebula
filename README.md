Nebula server
=============

Nebula is a media asset management and workflow automation system for TV and radio broadcast.

Key features
------------

 - media asset management, metadata handling
 - process automation (media conversion and analysis)
 - programme planning, scheduling
 - linear playout control
 - VOD and pseudolinear output automation
 - web and social publishing
 - statistics, reporting

Installation
------------

See [nebula-setup](https://github.com/nebulabroadcast/nebula-setup)
for installation scripts and instructions.

After initial setup, use `make install` to create symlinks for command line utilities
and create your first user using `./manage.py adduser` command.

During the setup, it is recommended to run `./manage.py run hub` and `./nebula.py` commands in
GNU `screen` to see potential errors, but `make install` also creates `nebula` and `nebula-hub`
systemd units (disabled by default), which you may use to run the software in production.

:warning: *systemd units assume nebula is installed in /opt/nebula/*

:warning: *nebula service waits 30 seconds before it is started by systemd*

To view a nebula log in realtime, use `nxl` command.

Need help?
----------

Professional support for Nebula is provided by [Nebula Broadcast](https://nebulabroadcast.com)
