
def make_pagination(current_page, page_count, **kwargs):
    """
    Created in 2:45 AM. Sorry. It was really painful.
    I tried to clean it up later, but i have no idea how it works.
    It is probabyly good idea to keep it as is.
    And do not fiddle with magic numbers.
    """

    LABEL_LEFT = "&laquo;"
    LABEL_RIGHT = "&raquo;"
    LABEL_DOTS = "<span>...</span>"

    left_edge = right_edge = 2
    left_current = right_current = 4
    btn_count = min(page_count, 11)

    result = []
    for j in range(btn_count):
        i = j+1
        #edges
        if i <= left_edge:
            num = i
        elif i > btn_count - right_edge:
            num = page_count - (btn_count - i)
        elif i == left_edge + 1 and current_page > left_edge + left_current:
            num = 0
        elif page_count - current_page < right_edge + right_current:
            num = page_count - btn_count + i
        elif i == btn_count - right_edge:
            num = 0
        elif current_page > left_edge + left_current:
            num = current_page + i - left_edge - left_current
        else:
            num = i

        if num > 0:
            label = str(num)
            cls = "active" if num == current_page else False
        else:
           label = "<span>...</span>"
           cls = "disabled"
        result.append([label, num, cls])


    if current_page == 1:
        result.insert(0,[LABEL_LEFT, current_page, False])
    else:
        result.insert(0,[LABEL_LEFT, current_page - 1, False])

    if current_page == page_count:
        result.append([LABEL_RIGHT, current_page, False])
    else:
        result.append([LABEL_RIGHT, current_page + 1, False])
    return result

