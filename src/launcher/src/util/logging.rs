#[cfg(windows)]
pub fn init_terminal() {
    let _ = colored::control::set_virtual_terminal(true);
}

#[cfg(not(windows))]
pub fn init_terminal() {}

/// Print a log if stdout is a terminal.
#[macro_export]
macro_rules! print_log {
    () => {{
        if ::std::io::IsTerminal::is_terminal(&::std::io::stderr()) {
            println!();
        }
    }};
    ($msg:expr) => {{
        if ::std::io::IsTerminal::is_terminal(&::std::io::stderr()) {
            println!($msg);
        }
    }};
    ($msg:expr, $($args:expr),* $(,)?) => {{
        if ::std::io::IsTerminal::is_terminal(&::std::io::stderr()) {
            println!($msg, $($args),*);
        }
    }}
}

/// Print an error in red if stderr is a terminal.
#[macro_export]
macro_rules! print_error {
    ($msg:expr) => {{
        if ::std::io::IsTerminal::is_terminal(&::std::io::stderr()) {
            eprintln!("{}", ::colored::Colorize::bright_red(&*$msg));
        }
    }};
    ($msg:expr, $($args:expr),* $(,)?) => {{
        if ::std::io::IsTerminal::is_terminal(&::std::io::stderr()) {
            let formatted = format!($msg, $($args),*);
            eprintln!("{}", ::colored::Colorize::bright_red(&*formatted));
        }
    }}
}
