NEBULA
======

![GitHub release (latest by date)](https://img.shields.io/github/v/release/nebulabroadcast/nebula?style=for-the-badge)
![Maintenance](https://img.shields.io/maintenance/yes/2021?style=for-the-badge)
![Last commit](https://img.shields.io/github/last-commit/immstudios/nebula?style=for-the-badge)
![Python version](https://img.shields.io/badge/python-3.7-blue?style=for-the-badge)

Nebula is an open source broadcast automation and media asset management system for television, radio and VOD platforms.
Since 2012 Nebula has proven stable and reliable software in 24/7 broadcast environment and it is now used by TV and production companies worldwide.
We put great emphasis on simplicity, modularity and speed.

Key features
------------

### Media Asset Management

Simple and fast media catalog based on [EBU&nbsp;Core](https://tech.ebu.ch/MetadataEbuCore) includes a description of asset
genre, editorial format, atmosphere, rights, relations, and technical metadata,
while its very fast search engine makes navigation among media files very easy.

Low-res preview allows editorial review, trimming and sub-clips creation.

![Metadata editor](https://nebulabroadcast.com/static/img/nebula-metadata-editor.webp)

### Video and audio cross-conversion and normalization

A preliminary media analysis and normalization guarantee its standards compliance.
This process includes metadata extraction, aspect ratio fixing, crop and rotation detection,
smart frame rate and size normalization and [EBU R128](https://tech.ebu.ch/docs/r/r128.pdf) loudness correction.

Automatic cross-conversion servers transcode files for playout, web, low-res proxies, customer previews, etc.
For **h.264** and **HEVC**, Nebula can take advantage of NVIDIA nvenc and leverage the speed of transcoding using GPUs.

It is possible to start conversions automatically (rule-based) or trigger them from the user interface.

### Linear scheduling

Firefly client provides a simple and user-friendly way to schedule linear broadcasting.
Macro- and micro-scheduling patterns are finished intuitively using drag&drop, including live events.

Nebula has also the ability to schedule for playback assets, which aren't finished yet.
As soon as a media file is created the media file and rundown item are paired automatically.

The optional [Dramatica](https://github.com/immstudios/dramatica) module makes program planning even easier;
depending on the particular broadcast scheme, Dramatica selects and automatically completes convenient shows, self-promotions, trailers, and fillings.

It is the way to create a playlist for a music station where an algorithm automatically creates a playlist based on a predefined scheme.
Each clip in the rundown is picked by its editorial format, genre, tempo, atmosphere, etc.

![Detail of a scheduler panel in the Firefly application](https://nebulabroadcast.com/static/img/nebula-scheduler.webp)


### Playout control

For linear broadcasting, Nebula can control 
[CasparCG](https://casparcg.com), [VLC](https://videolan.org) or [Conti](https://github.com/immstudios/conti).
Broadcasting can run autonomously with and option of starting blocks at a specified time.

Users - master control room operators - can interfere with the rundown using [Firefly client](https://github.com/nebulabroadcast/firefly),
executing graphics or change run order until the last moment.

Playout control module offers a plug-in interface for secondary events execution such as CG, router or studio control,
recorders control and so on. Right at the operator's fingertips.

![Detail of a rundown panel with playout control interface](https://nebulabroadcast.com/static/img/nebula-playout-control.webp)

### Dynamic Character Generator (CG)

A CG render engine can insert a large variety of graphical elements generated from metadata such as
tickers, subtitles, banner ads, charts, weather graphics, currency rates, traffic information, clock, etc.

Infographic elements are allowed to be generated both from public data resources or a content management system.

### Publishing

Nebula can be linked to a company website via the API.
Media files are automatically uploaded to the web or social networks after the planned program is broadcasted.

### Statistics and reporting

Nebula allows generating various statistics and reports for collective rights management societies like OSA, DACS, etc. in an xls file.

### Management and monitoring

A simple web based interface allows various management tasks (services and jobs monitoring, user management...) as well as simplified MAM access for
editorial work without Firefly installed.

Nebula provides extensive system metrics in [Prometheus](https://prometheus.io) format. [Grafana](https://grafana.com)
dashboard can be used for their visualization and alerting in case of problems.

### Reliability

Nebula is under active development and is in production since 2012 with no intenitons of abandoning the project,
and we have a roadmap for several years. We listen to our customers, and we change our priorities in order to meet
requests from the production.

We do not try to have tons of features noone will ever use - we spent many years sitting next to Nebula operators,
learning from each other, and we believe that Nebula covers all common tasks in a broadcast environment.

Installation
------------

See [nebula-setup](https://github.com/nebulabroadcast/nebula-setup)
for installation scripts and instructions. 
If you already have a running instance and you are about to add another node, 
you may use `support/install_prerequisites.sh` script to install required Python libraries and tools.

 - After initial setup, use `make install` command to create symlinks for command-line utilities.
 - Create your first user using `nxadduser` command.
 - During the setup, we recommended running `./manage.py run hub` and `./nebula.py`
   commands in GNU screen to track down possible errors
 - `make install` also creates *nebula* and *nebula-hub* systemd units (disabled by default),
   which you should use to run the software in production.
 - systemd units assume nebula is installed in `/opt/nebula/`
 - keep in mind that *nebula* service waits 30 seconds before it is started by systemd

Command line tools
------------------

 - `nxl` real-time log viewer
 - `nxadduser` add a new user to the system
 - `nxpasswd` change user password
 - `nxa {id_view:int} {search_query:string}` asset browser
 - `nxj` jobs monitor
 - `nxs {[command:start|stop|auto|noauto] id_service:int}` services monitor and control panel
 - `nxt [tool_name:string]` plug-in runner

  
Legal
-----

*Nebula* is developed and maintained by [imm studios, z.s.](https://imm.cz)

### License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

Need help?
----------

 - Visit our Nebula community group on [Telegram](https://t.me/nebulabroadcast)
 - Professional support for Nebula is provided by [Nebula Broadcast](https://nebulabroadcast.com)
 - User documentation is available on [our website](https://nebulabroadcast.com/doc/nebula)
 - Found a bug? Please [create an issue](https://github.com/immstudios/nebula/issues) in our development repository.
