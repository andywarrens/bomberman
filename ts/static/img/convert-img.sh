docker run -v /Users/andywarrens/Projects/elm/FoodFlow/img:/images --rm -it v4tech/imagemagick \
    convert /images/$1.png /images/$1.jpg
